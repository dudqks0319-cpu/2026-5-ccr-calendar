import type {
  CCRCalendarState,
  CalendarDay,
  CTeamExcludeMode,
  CTeamKey,
  MaterialRule,
  MonthStartAnchor,
  MonthSchedule,
} from '../types/ccr.js';
import { getDaysInMonth, toDateKey, toMonthKey } from '../utils/date.js';
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

const HOLIDAY_LABELS = ['노동절', '어린이날', '석가탄신일', '지방선거', '현충일'];

function normalizeDate(dateKey: string) {
  const date = new Date(dateKey);
  date.setHours(0, 0, 0, 0);
  return date;
}

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
  const monthCTeamKey = state.monthCTeamKeys[dateKey.slice(0, 7)];
  if (monthCTeamKey) return state.cTeams[monthCTeamKey]?.members.filter(Boolean).join(', ') || '';
  const monthMembers = state.monthCTeams[dateKey.slice(0, 7)];
  if (monthMembers?.length) return monthMembers.filter(Boolean).join(', ');
  const selectedCTeam = state.cTeams[state.selectedCTeamKey];
  return selectedCTeam?.members.filter(Boolean).join(', ') || '';
}

function parseCTeamText(value: string) {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getMonthCTeamMembers(
  state: CCRCalendarState,
  year: number,
  monthIndex: number,
) {
  const monthKey = toMonthKey(year, monthIndex);
  const monthCTeamKey = state.monthCTeamKeys[monthKey];
  if (monthCTeamKey) return state.cTeams[monthCTeamKey]?.members.filter(Boolean) || [];
  const monthMembers = state.monthCTeams[monthKey];
  if (monthMembers?.length) return monthMembers.filter(Boolean);
  return state.cTeams[state.selectedCTeamKey]?.members.filter(Boolean) || [];
}

export function getMonthCTeamKey(
  state: CCRCalendarState,
  year: number,
  monthIndex: number,
): CTeamKey | '' {
  const monthKey = toMonthKey(year, monthIndex);
  const savedKey = state.monthCTeamKeys[monthKey];
  if (savedKey) return savedKey;

  const monthMembers = state.monthCTeams[monthKey]?.filter(Boolean);
  if (monthMembers?.length) {
    const matched = (Object.keys(state.cTeams) as CTeamKey[]).find((teamKey) => {
      const members = state.cTeams[teamKey]?.members.filter(Boolean) || [];
      return members.length === monthMembers.length && members.every((member, index) => member === monthMembers[index]);
    });
    return matched || '';
  }

  return state.selectedCTeamKey;
}

export function getDateCTeamMembers(
  dateKey: string,
  state: CCRCalendarState,
  year: number,
  monthIndex: number,
) {
  const overrideText = state.overrides[dateKey]?.cTeamText;
  if (overrideText) return parseCTeamText(overrideText);
  return getMonthCTeamMembers(state, year, monthIndex);
}

export function isDateOff(dateKey: string, dayOfWeek: number, state: CCRCalendarState) {
  const override = state.overrides[dateKey];
  const overrideValue = override?.isOff;
  const isSaturdayOvertime =
    dayOfWeek === 6 &&
    (override?.isSaturdayOvertime ?? state.saturdayOvertime[dateKey]) === true;
  const offDayValue = state.offDays[dateKey];
  if (typeof overrideValue === 'boolean') return overrideValue;
  if (isSaturdayOvertime) return false;
  if (offDayValue === true) return true;
  if (dayOfWeek === 0) return true;
  if (dayOfWeek === 6 && state.saturdayDefaultOff) return true;
  return false;
}

export function getMonthStartWithNight(
  state: CCRCalendarState,
  year: number,
  monthIndex: number,
) {
  return state.monthStartWithNight[toMonthKey(year, monthIndex)] ?? state.startWithNight;
}

export function getTwoWeekTeamLabel(dateKey: string, state: CCRCalendarState) {
  const rotation = state.twoWeekTeamRotation;
  if (!rotation.enabled || rotation.teams.length === 0) return '';
  const target = normalizeDate(dateKey);
  const start = normalizeDate(rotation.startDate);
  const diffDays = Math.floor((target.getTime() - start.getTime()) / 86_400_000);
  if (diffDays < 0) return '';
  const index = Math.floor(diffDays / rotation.intervalDays) % rotation.teams.length;
  return rotation.teams[index] || '';
}

function getDayLabels(
  dateKey: string,
  dayOfWeek: number,
  isNight: boolean,
  isSaturdayOvertime: boolean,
  state: CCRCalendarState,
) {
  const override = state.overrides[dateKey];
  const legacyComment = override?.comment || '';
  const storedComment = state.comments[dateKey] || '';
  const isLegacyHoliday = HOLIDAY_LABELS.includes(legacyComment);
  const isLegacyWeekTeam = state.twoWeekTeamRotation.teams.includes(legacyComment);
  const isLegacySpecialWork = legacyComment === '생산특근';
  const holidayName = override?.holidayName || (isLegacyHoliday ? legacyComment : '');
  const computedWeekTeamLabel =
    dayOfWeek === 1 && isNight ? getTwoWeekTeamLabel(dateKey, state) : '';
  const weekTeamLabel =
    override?.weekTeamLabel || (isLegacyWeekTeam ? legacyComment : computedWeekTeamLabel);
  const specialWorkLabel =
    override?.specialWorkLabel || (isLegacySpecialWork ? legacyComment : isSaturdayOvertime ? '생산특근' : '');
  const userComment =
    override?.userComment ||
    storedComment ||
    (!isLegacyHoliday && !isLegacyWeekTeam && !isLegacySpecialWork ? legacyComment : '');
  const comment = holidayName || specialWorkLabel || weekTeamLabel || userComment;

  return {
    holidayName,
    weekTeamLabel,
    specialWorkLabel,
    userComment,
    comment,
  };
}

export function generateMonthSchedule(
  state: CCRCalendarState,
  year = state.selectedYear,
  monthIndex = state.selectedMonthIndex,
): MonthSchedule {
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const firstDayOfMonthWeekday = new Date(year, monthIndex, 1).getDay();
  const baseRotation = buildBaseRotation(state.dayTeams);
  const startWithNight = getMonthStartWithNight(state, year, monthIndex);
  const monthKey = toMonthKey(year, monthIndex);
  const days: CalendarDay[] = [];
  let pointer = state.monthStartPointer[monthKey] ?? 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = toDateKey(year, monthIndex, day);
    const date = new Date(year, monthIndex, day);
    const dayOfWeek = date.getDay();
    const isNight = isNightWeek(day, firstDayOfMonthWeekday, startWithNight);
    const override = state.overrides[dateKey];
    const isSaturdayOvertime =
      dayOfWeek === 6 &&
      (override?.isSaturdayOvertime ?? state.saturdayOvertime[dateKey]) === true;
    const isOff = isDateOff(dateKey, dayOfWeek, state);
    const isManualOff = override?.isOff === true || state.offDays[dateKey] === true;
    const materialWorker =
      override?.materialWorker || state.materialRule.dateWorkers[dateKey] || getMaterialWorker(dateKey, state);
    const sealerTeam = getSealerTeam(dateKey, state.sealerRotation);
    const labels = getDayLabels(dateKey, dayOfWeek, isNight, isSaturdayOvertime, state);
    const cTeamText = isNight ? getCTeamText(dateKey, state) : '';
    const selectedCTeamMembers = getDateCTeamMembers(dateKey, state, year, monthIndex);

    if (isOff) {
      days.push({
        dateKey,
        day,
        dayOfWeek,
        isOff: true,
        isManualOff,
        isNight,
        am: 'OFF',
        pm: 'OFF',
        cTeamText,
        materialWorker: !isNight ? materialWorker : '',
        isSaturdayOvertime,
        sealerTeam,
        comment: labels.comment,
        holidayName: labels.holidayName,
        weekTeamLabel: labels.weekTeamLabel,
        specialWorkLabel: labels.specialWorkLabel,
        userComment: labels.userComment,
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
      isManualOff: false,
      isNight,
      am,
      pm,
      cTeamText,
      materialWorker: !isNight ? materialWorker : '',
      isSaturdayOvertime,
      sealerTeam,
      comment: labels.comment,
      holidayName: labels.holidayName,
      weekTeamLabel: labels.weekTeamLabel,
      specialWorkLabel: labels.specialWorkLabel,
      userComment: labels.userComment,
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

export function findMonthStartPointerForAnchors(
  state: CCRCalendarState,
  year: number,
  monthIndex: number,
  anchors: MonthStartAnchor[],
) {
  const baseRotation = buildBaseRotation(state.dayTeams);
  const validAnchors = anchors.filter((anchor) => anchor.dateKey && anchor.am && anchor.pm);
  if (baseRotation.length === 0 || validAnchors.length === 0) return null;

  const monthKey = toMonthKey(year, monthIndex);
  const scrubbedOverrides = { ...state.overrides };
  for (const anchor of validAnchors) {
    const { am: _am, pm: _pm, ...rest } = scrubbedOverrides[anchor.dateKey] || {};
    scrubbedOverrides[anchor.dateKey] = rest;
  }

  for (let pointer = 0; pointer < baseRotation.length; pointer += 1) {
    const candidateState: CCRCalendarState = {
      ...state,
      overrides: scrubbedOverrides,
      monthStartPointer: {
        ...state.monthStartPointer,
        [monthKey]: pointer,
      },
    };
    const schedule = generateMonthSchedule(candidateState, year, monthIndex);
    const satisfiesAll = validAnchors.every((anchor) => {
      const day = schedule.days.find((item) => item.dateKey === anchor.dateKey);
      if (!day || day.isOff) return false;
      if (anchor.shift === 'night' && !day.isNight) return false;
      if (anchor.shift === 'day' && day.isNight) return false;
      return day.am === anchor.am && day.pm === anchor.pm;
    });

    if (satisfiesAll) return pointer;
  }

  return null;
}
