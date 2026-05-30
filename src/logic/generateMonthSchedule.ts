import type {
  CCRCalendarState,
  CalendarDay,
  CTeamExcludeMode,
  CTeamKey,
  MaterialRule,
  MonthStartAnchor,
  MonthSchedule,
  ShiftStartType,
  TeamKey,
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

type GeneratedMonth = MonthSchedule & {
  finalPointers: Record<ShiftStartType, number>;
};

type AnchoredTeamRotation = {
  nextTeamKey: TeamKey;
  memberIndexes: Record<TeamKey, number>;
};

const HOLIDAY_LABELS = ['노동절', '어린이날', '석가탄신일', '지방선거', '현충일'];
const MONTH_CARRY_LOOKBACK_LIMIT = 36;
const ROTATION_TEAM_ORDER: TeamKey[] = ['conveyor', 'robot', 'main'];

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

function getWorkerPointer(rotation: string[], workerName: string) {
  const index = rotation.findIndex((worker) => worker === workerName);
  return index >= 0 ? index : null;
}

function getPointerAfterWorker(rotation: string[], workerName: string, fallbackPointer: number) {
  const index = getWorkerPointer(rotation, workerName);
  return index === null ? fallbackPointer : index + 1;
}

function getWorkerTeamKey(state: CCRCalendarState, workerName: string): TeamKey | null {
  for (const teamKey of ROTATION_TEAM_ORDER) {
    if (state.dayTeams[teamKey].members.includes(workerName)) return teamKey;
  }

  return null;
}

function getNextTeamKey(teamKey: TeamKey): TeamKey {
  const index = ROTATION_TEAM_ORDER.indexOf(teamKey);
  return ROTATION_TEAM_ORDER[(index + 1) % ROTATION_TEAM_ORDER.length];
}

function getTeamPointerAfterWorker(
  state: CCRCalendarState,
  teamKey: TeamKey,
  workerName: string,
  fallbackPointer: number,
) {
  const members = state.dayTeams[teamKey].members.filter(Boolean);
  const index = members.indexOf(workerName);
  if (index < 0 || members.length === 0) return fallbackPointer;
  return (index + 1) % members.length;
}

function getTeamMemberIndex(
  state: CCRCalendarState,
  teamKey: TeamKey,
  workerName: string,
  fallbackPointer: number,
) {
  const members = state.dayTeams[teamKey].members.filter(Boolean);
  const index = members.indexOf(workerName);
  if (index < 0 || members.length === 0) return fallbackPointer;
  return index;
}

function getDefaultTeamMemberIndexes(
  state: CCRCalendarState,
  rotation: string[],
  pointer: number,
): Record<TeamKey, number> {
  const indexes = Object.fromEntries(
    ROTATION_TEAM_ORDER.map((teamKey) => [teamKey, 0]),
  ) as Record<TeamKey, number>;
  const unresolved = new Set<TeamKey>(ROTATION_TEAM_ORDER);

  if (rotation.length === 0) return indexes;

  for (let offset = 0; offset < rotation.length && unresolved.size > 0; offset += 1) {
    const workerName = rotation[(pointer + offset) % rotation.length];
    const teamKey = getWorkerTeamKey(state, workerName);
    if (!teamKey || !unresolved.has(teamKey)) continue;
    indexes[teamKey] = getTeamMemberIndex(state, teamKey, workerName, indexes[teamKey]);
    unresolved.delete(teamKey);
  }

  return indexes;
}

function getPointerForTeamRotation(
  state: CCRCalendarState,
  rotation: string[],
  teamRotation: AnchoredTeamRotation,
  fallbackPointer: number,
) {
  const members = state.dayTeams[teamRotation.nextTeamKey].members.filter(Boolean);
  if (members.length === 0) return fallbackPointer;
  const workerName =
    members[teamRotation.memberIndexes[teamRotation.nextTeamKey] % members.length];
  return getWorkerPointer(rotation, workerName) ?? fallbackPointer;
}

function createAnchoredTeamRotation(
  state: CCRCalendarState,
  rotation: string[],
  pointer: number,
  am: string,
  pm: string,
): AnchoredTeamRotation | null {
  const amTeamKey = getWorkerTeamKey(state, am);
  const pmTeamKey = getWorkerTeamKey(state, pm);
  const nextTeamKey = pmTeamKey || amTeamKey;
  if (!nextTeamKey) return null;

  const memberIndexes = getDefaultTeamMemberIndexes(state, rotation, pointer);

  if (amTeamKey) {
    memberIndexes[amTeamKey] = getTeamPointerAfterWorker(
      state,
      amTeamKey,
      am,
      memberIndexes[amTeamKey],
    );
  }

  if (pmTeamKey) {
    memberIndexes[pmTeamKey] = getTeamPointerAfterWorker(
      state,
      pmTeamKey,
      pm,
      memberIndexes[pmTeamKey],
    );
  }

  return {
    nextTeamKey,
    memberIndexes,
  };
}

function applyAnchoredManualAssignment(
  state: CCRCalendarState,
  teamRotation: AnchoredTeamRotation,
  am: string,
  pm: string,
) {
  const amTeamKey = getWorkerTeamKey(state, am);
  const pmTeamKey = getWorkerTeamKey(state, pm);

  if (amTeamKey) {
    teamRotation.memberIndexes[amTeamKey] = getTeamPointerAfterWorker(
      state,
      amTeamKey,
      am,
      teamRotation.memberIndexes[amTeamKey],
    );
  }

  if (pmTeamKey) {
    teamRotation.memberIndexes[pmTeamKey] = getTeamPointerAfterWorker(
      state,
      pmTeamKey,
      pm,
      teamRotation.memberIndexes[pmTeamKey],
    );
    teamRotation.nextTeamKey = pmTeamKey;
    return;
  }

  if (amTeamKey) {
    teamRotation.nextTeamKey = amTeamKey;
  }
}

function pickNextAnchoredWorker(
  state: CCRCalendarState,
  teamRotation: AnchoredTeamRotation,
  context: PickContext,
) {
  const totalMembers = ROTATION_TEAM_ORDER.reduce(
    (total, teamKey) => total + state.dayTeams[teamKey].members.filter(Boolean).length,
    0,
  );
  const maxAttempts = Math.max(totalMembers * ROTATION_TEAM_ORDER.length, 1);
  let attempts = 0;

  while (attempts < maxAttempts) {
    const teamKey = teamRotation.nextTeamKey;
    const members = state.dayTeams[teamKey].members.filter(Boolean);

    if (members.length === 0) {
      teamRotation.nextTeamKey = getNextTeamKey(teamKey);
      attempts += 1;
      continue;
    }

    let teamAttempts = 0;
    while (teamAttempts < members.length && attempts < maxAttempts) {
      const memberIndex = teamRotation.memberIndexes[teamKey] % members.length;
      const workerName = members[memberIndex];
      teamRotation.memberIndexes[teamKey] = (memberIndex + 1) % members.length;
      attempts += 1;

      if (!shouldExcludeWorker(workerName, context)) {
        teamRotation.nextTeamKey = getNextTeamKey(teamKey);
        return {
          workerName,
          teamKey,
        };
      }

      teamAttempts += 1;
    }

    teamRotation.nextTeamKey = getNextTeamKey(teamKey);
  }

  return {
    workerName: '',
    teamKey: null as TeamKey | null,
  };
}

function getMonthIndexNumber(year: number, monthIndex: number) {
  return year * 12 + monthIndex;
}

function parseMonthKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return null;
  return {
    year,
    monthIndex: month - 1,
    value: getMonthIndexNumber(year, month - 1),
  };
}

function getPreviousMonth(year: number, monthIndex: number) {
  if (monthIndex === 0) {
    return {
      year: year - 1,
      monthIndex: 11,
    };
  }

  return {
    year,
    monthIndex: monthIndex - 1,
  };
}

function rotateCTeamKey(baseKey: CTeamKey, monthOffset: number): CTeamKey {
  const keys: CTeamKey[] = ['A', 'B', 'C', 'D', 'E'];
  const baseIndex = keys.indexOf(baseKey);
  if (baseIndex < 0) return baseKey;
  const nextIndex = ((baseIndex + monthOffset) % keys.length + keys.length) % keys.length;
  return keys[nextIndex];
}

function matchCTeamKeyByMembers(state: CCRCalendarState, members: string[]) {
  if (members.length === 0) return '';
  return (Object.keys(state.cTeams) as CTeamKey[]).find((teamKey) => {
    const teamMembers = state.cTeams[teamKey]?.members.filter(Boolean) || [];
    return teamMembers.length === members.length && teamMembers.every((member, index) => member === members[index]);
  }) || '';
}

function getAutoMonthCTeamKey(
  state: CCRCalendarState,
  year: number,
  monthIndex: number,
): CTeamKey {
  const targetValue = getMonthIndexNumber(year, monthIndex);
  const anchors = Object.entries(state.monthCTeamKeys)
    .map(([monthKey, teamKey]) => {
      const parsed = parseMonthKey(monthKey);
      return parsed && teamKey ? { ...parsed, teamKey } : null;
    })
    .filter((item): item is { year: number; monthIndex: number; value: number; teamKey: CTeamKey } => Boolean(item))
    .filter((item) => item.value <= targetValue)
    .sort((left, right) => right.value - left.value);

  const nearestAnchor = anchors[0];
  if (!nearestAnchor) return state.selectedCTeamKey;

  return rotateCTeamKey(nearestAnchor.teamKey, targetValue - nearestAnchor.value);
}

export function getCTeamText(dateKey: string, state: CCRCalendarState) {
  const override = state.overrides[dateKey];
  if (override?.cTeamText) return override.cTeamText;
  const [year, month] = dateKey.slice(0, 7).split('-').map(Number);
  if (!year || !month) return '';
  return getMonthCTeamMembers(state, year, month - 1).join(', ');
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
  return state.cTeams[getAutoMonthCTeamKey(state, year, monthIndex)]?.members.filter(Boolean) || [];
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
    const matched = matchCTeamKeyByMembers(state, monthMembers);
    return matched || '';
  }

  return getAutoMonthCTeamKey(state, year, monthIndex);
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
  const { finalPointers: _finalPointers, ...schedule } = generateMonthScheduleWithPointers(
    state,
    year,
    monthIndex,
  );
  return schedule;
}

function getInitialShiftPointers(
  state: CCRCalendarState,
  year: number,
  monthIndex: number,
  depth: number,
) {
  const monthKey = toMonthKey(year, monthIndex);
  const legacyPointer = state.monthStartPointer[monthKey];
  const explicitShiftPointer = state.monthShiftStartPointer[monthKey];
  const hasDayPointer = typeof explicitShiftPointer?.day === 'number' || typeof legacyPointer === 'number';
  const hasNightPointer = typeof explicitShiftPointer?.night === 'number' || typeof legacyPointer === 'number';

  if ((hasDayPointer && hasNightPointer) || depth >= MONTH_CARRY_LOOKBACK_LIMIT) {
    return {
      day: explicitShiftPointer?.day ?? legacyPointer ?? 0,
      night: explicitShiftPointer?.night ?? legacyPointer ?? 0,
    };
  }

  const previousMonth = getPreviousMonth(year, monthIndex);
  const previousSchedule = generateMonthScheduleWithPointers(
    state,
    previousMonth.year,
    previousMonth.monthIndex,
    depth + 1,
  );

  return {
    day: explicitShiftPointer?.day ?? legacyPointer ?? previousSchedule.finalPointers.day,
    night: explicitShiftPointer?.night ?? legacyPointer ?? previousSchedule.finalPointers.night,
  };
}

function generateMonthScheduleWithPointers(
  state: CCRCalendarState,
  year = state.selectedYear,
  monthIndex = state.selectedMonthIndex,
  depth = 0,
): GeneratedMonth {
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const firstDayOfMonthWeekday = new Date(year, monthIndex, 1).getDay();
  const baseRotation = buildBaseRotation(state.dayTeams);
  const monthKey = toMonthKey(year, monthIndex);
  const startWithNight = getMonthStartWithNight(state, year, monthIndex);
  const days: CalendarDay[] = [];
  const initialPointers = getInitialShiftPointers(state, year, monthIndex, depth);
  let dayPointer = initialPointers.day;
  let nightPointer = initialPointers.night;
  const shiftBlockCounts: Record<ShiftStartType, number> = {
    day: 0,
    night: 0,
  };
  const lastPmByShift: Partial<Record<ShiftStartType, string>> = {};
  const monthStartAnchors = state.monthStartAnchors[monthKey] || {};
  const anchoredTeamRotations: Partial<Record<ShiftStartType, AnchoredTeamRotation>> = {};
  let lastWorkShift: ShiftStartType | null = null;

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

    const shiftType: ShiftStartType = isNight ? 'night' : 'day';
    const isNewShiftBlock = lastWorkShift !== shiftType;
    if (isNewShiftBlock) {
      shiftBlockCounts[shiftType] += 1;
      const anchoredRotation = anchoredTeamRotations[shiftType];
      if (!anchoredRotation) {
        const lastPmPointer = lastPmByShift[shiftType]
          ? getWorkerPointer(baseRotation, lastPmByShift[shiftType] || '')
          : null;
        if (shiftBlockCounts[shiftType] > 1 && lastPmPointer !== null) {
          if (shiftType === 'night') {
            nightPointer = lastPmPointer;
          } else {
            dayPointer = lastPmPointer;
          }
        }
      }
      lastWorkShift = shiftType;
    }

    const pointer = isNight ? nightPointer : dayPointer;
    const pickContext: PickContext = {
      isNight,
      selectedCTeamMembers,
      materialWorker,
      cTeamExcludeMode: state.cTeamExcludeMode,
      materialRule: state.materialRule,
    };
    const startAnchor = monthStartAnchors[shiftType];
    const isStartAnchorDate =
      startAnchor?.dateKey === dateKey && Boolean(startAnchor.am && startAnchor.pm);
    let anchoredRotation = anchoredTeamRotations[shiftType];
    let am = '';
    let pm = '';

    if (isStartAnchorDate) {
      am = startAnchor?.am || '';
      pm = startAnchor?.pm || '';
      anchoredRotation = createAnchoredTeamRotation(state, baseRotation, pointer, am, pm) || undefined;
      anchoredTeamRotations[shiftType] = anchoredRotation;
    } else if (anchoredRotation) {
      const candidateAm = override?.am || '';
      if (candidateAm) {
        am = candidateAm;
      } else {
        const autoAm = pickNextAnchoredWorker(state, anchoredRotation, pickContext);
        am = autoAm.workerName;
      }

      const candidatePm = override?.pm || '';
      if (candidatePm) {
        pm = candidatePm;
      } else {
        const autoPm = pickNextAnchoredWorker(state, anchoredRotation, {
          ...pickContext,
          additionalExcludedNames: am ? [am] : [],
        });
        pm = autoPm.workerName;
      }

      if (override?.am || override?.pm) {
        applyAnchoredManualAssignment(state, anchoredRotation, am, pm);
      } else {
        const pmTeamKey = getWorkerTeamKey(state, pm);
        if (pmTeamKey) anchoredRotation.nextTeamKey = pmTeamKey;
      }
    } else {
      const shouldUsePresetAssignment = shiftBlockCounts[shiftType] === 1;
      const autoAm = pickNextWorker(baseRotation, pointer, pickContext);
      const candidateAm = override?.am || (shouldUsePresetAssignment ? override?.presetAm : '');
      const canUseCandidateAm =
        Boolean(candidateAm) && !shouldExcludeWorker(candidateAm || '', pickContext);
      am = canUseCandidateAm ? candidateAm || '' : autoAm.workerName;

      const usedManualAm = Boolean(override?.am) && canUseCandidateAm;
      const pmStartPointer = usedManualAm
        ? getPointerAfterWorker(baseRotation, am, autoAm.nextPointer)
        : autoAm.nextPointer;
      const autoPm = pickNextWorker(baseRotation, pmStartPointer, {
        ...pickContext,
        additionalExcludedNames: am ? [am] : [],
      });
      const overridePmContext = {
        ...pickContext,
        additionalExcludedNames: am ? [am] : [],
      };
      const candidatePm = override?.pm || (shouldUsePresetAssignment ? override?.presetPm : '');
      const canUseCandidatePm =
        Boolean(candidatePm) && !shouldExcludeWorker(candidatePm || '', overridePmContext);
      pm = canUseCandidatePm ? candidatePm || '' : autoPm.workerName;
    }

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

    lastPmByShift[shiftType] = pm;

    const anchoredNextPointer = anchoredTeamRotations[shiftType]
      ? getPointerForTeamRotation(
          state,
          baseRotation,
          anchoredTeamRotations[shiftType],
          pointer + 1,
        )
      : null;
    const usedManualAssignment = Boolean(override?.am || override?.pm);
    const usedPresetAssignment =
      anchoredNextPointer === null &&
      !usedManualAssignment &&
      shiftBlockCounts[shiftType] === 1 &&
      Boolean(override?.presetAm || override?.presetPm);
    const nextPointer =
      anchoredNextPointer ??
      (usedPresetAssignment ? pointer + 1 : getWorkerPointer(baseRotation, pm) ?? pointer + 1);

    if (isNight) {
      nightPointer = nextPointer;
    } else {
      dayPointer = nextPointer;
    }
  }

  return {
    year,
    monthIndex,
    firstDayOfMonthWeekday,
    days,
    finalPointers: {
      day: dayPointer,
      night: nightPointer,
    },
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
    const {
      am: _am,
      pm: _pm,
      presetAm: _presetAm,
      presetPm: _presetPm,
      ...rest
    } = scrubbedOverrides[anchor.dateKey] || {};
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
      monthShiftStartPointer: {
        ...state.monthShiftStartPointer,
        [monthKey]: {
          ...state.monthShiftStartPointer[monthKey],
          ...Object.fromEntries(validAnchors.map((anchor) => [anchor.shift, pointer])),
        },
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
