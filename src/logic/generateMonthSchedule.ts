import type {
  CCRCalendarState,
  CalendarDay,
  CTeamExcludeMode,
  MaterialRule,
  MonthSchedule,
} from '../types/ccr.js';
import { getDaysInMonth, toDateKey } from '../utils/date.js';
import { buildBaseRotation } from './buildBaseRotation.js';
import { getMaterialWorker } from './getMaterialWorker.js';
import { getSealerTeam } from './getSealerTeam.js';

type PickContext = {
  isNight: boolean;
  selectedCTeamMembers: string[];
  materialWorker: string;
  cTeamExcludeMode: CTeamExcludeMode;
  materialRule: MaterialRule;
  additionalExcludedNames?: string[];
};

export function isNightWeek(
  day: number,
  firstDayOfMonthWeekday: number,
  startWithNight: boolean,
) {
  const weekIndex = Math.floor((day + firstDayOfMonthWeekday - 1) / 7);
  return startWithNight ? weekIndex % 2 === 0 : weekIndex % 2 === 1;
}

export function shouldExcludeWorker(workerNameToCheck: string, context: PickContext) {
  if (!workerNameToCheck) return true;
  if (context.additionalExcludedNames?.includes(workerNameToCheck)) return true;

  if (
    context.materialRule.enabled &&
    context.materialRule.excludeOnDayShift &&
    !context.isNight &&
    workerNameToCheck === context.materialWorker
  ) {
    return true;
  }

  if (context.cTeamExcludeMode === 'always') {
    return context.selectedCTeamMembers.includes(workerNameToCheck);
  }

  if (context.cTeamExcludeMode === 'nightOnly' && context.isNight) {
    return context.selectedCTeamMembers.includes(workerNameToCheck);
  }

  return false;
}

export function pickNextWorker(rotation: string[], pointer: number, context: PickContext) {
  if (rotation.length === 0) {
    throw new Error('근무자 순번표가 비어 있습니다.');
  }

  let attempts = 0;
  let currentPointer = pointer;

  while (attempts < rotation.length) {
    const workerName = rotation[currentPointer % rotation.length];
    currentPointer += 1;

    if (!shouldExcludeWorker(workerName, context)) {
      return {
        workerName,
        nextPointer: currentPointer,
      };
    }

    attempts += 1;
  }

  return {
    workerName: '',
    nextPointer: currentPointer,
  };
}

export function getCTeamText(dateKey: string, state: CCRCalendarState) {
  const override = state.overrides[dateKey];
  if (override?.cTeamText) return override.cTeamText;
  const selectedCTeam = state.cTeams[state.selectedCTeamKey];
  return selectedCTeam?.members.filter(Boolean).join(', ') || '';
}

export function isDateOff(dateKey: string, isSunday: boolean, state: CCRCalendarState) {
  const overrideValue = state.overrides[dateKey]?.isOff;
  const offDayValue = state.offDays[dateKey];
  if (typeof overrideValue === 'boolean') return overrideValue;
  if (typeof offDayValue === 'boolean') return offDayValue;
  return isSunday;
}

export function generateMonthSchedule(
  state: CCRCalendarState,
  year = state.selectedYear,
  monthIndex = state.selectedMonthIndex,
): MonthSchedule {
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const firstDayOfMonthWeekday = new Date(year, monthIndex, 1).getDay();
  const baseRotation = buildBaseRotation(state.dayTeams);
  const selectedCTeamMembers =
    state.cTeams[state.selectedCTeamKey]?.members.filter(Boolean) || [];
  const days: CalendarDay[] = [];
  let pointer = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = toDateKey(year, monthIndex, day);
    const date = new Date(year, monthIndex, day);
    const dayOfWeek = date.getDay();
    const isSunday = dayOfWeek === 0;
    const isOff = isDateOff(dateKey, isSunday, state);
    const isNight = isNightWeek(day, firstDayOfMonthWeekday, state.startWithNight);
    const override = state.overrides[dateKey];
    const materialWorker =
      override?.materialWorker || state.materialRule.dateWorkers[dateKey] || getMaterialWorker(dateKey, state);
    const sealerTeam = getSealerTeam(dateKey, state.sealerRotation);
    const comment = override?.comment ?? state.comments[dateKey] ?? '';
    const cTeamText = isNight ? getCTeamText(dateKey, state) : '';
    const isSaturdayOvertime =
      dayOfWeek === 6 &&
      (override?.isSaturdayOvertime ?? state.saturdayOvertime[dateKey]) === true;

    if (isOff) {
      days.push({
        dateKey,
        day,
        dayOfWeek,
        isOff: true,
        isNight,
        am: 'OFF',
        pm: 'OFF',
        cTeamText,
        materialWorker: !isNight ? materialWorker : '',
        isSaturdayOvertime,
        sealerTeam,
        comment,
      });
      continue;
    }

    const pickContext: PickContext = {
      isNight,
      selectedCTeamMembers,
      materialWorker,
      cTeamExcludeMode: state.cTeamExcludeMode,
      materialRule: state.materialRule,
    };
    const autoAm = pickNextWorker(baseRotation, pointer, pickContext);
    const autoPm = pickNextWorker(baseRotation, autoAm.nextPointer, {
      ...pickContext,
      additionalExcludedNames: autoAm.workerName ? [autoAm.workerName] : [],
    });

    const am = override?.am || autoAm.workerName;
    const pm = override?.pm || autoPm.workerName;

    days.push({
      dateKey,
      day,
      dayOfWeek,
      isOff: false,
      isNight,
      am,
      pm,
      cTeamText,
      materialWorker: !isNight ? materialWorker : '',
      isSaturdayOvertime,
      sealerTeam,
      comment,
    });

    pointer += 1;
  }

  return {
    year,
    monthIndex,
    firstDayOfMonthWeekday,
    days,
  };
}
