import { C_TEAM_KEYS, DEFAULT_STATE, STORAGE_KEY } from '../constants/defaults.js';
import { applyApril2026PhotoPreset } from '../constants/april2026Preset.js';
import { applyJune2026PhotoPreset } from '../constants/june2026Preset.js';
import { applyMay2026PhotoPreset } from '../constants/may2026Preset.js';
import type { CCRCalendarState, DayOverride } from '../types/ccr.js';
import { downloadTextFile, toDateKey } from '../utils/date.js';

function cTeamDepartmentsFromMembers(members: string[]) {
  return {
    conveyor: members[0] ? [members[0]] : [],
    robot: members[1] ? [members[1]] : [],
    main: members[2] ? [members[2]] : [],
  };
}

function cloneDefaultState(): CCRCalendarState {
  const state = JSON.parse(JSON.stringify(DEFAULT_STATE)) as CCRCalendarState;
  return applyJune2026PhotoPreset(applyMay2026PhotoPreset(applyApril2026PhotoPreset(state)));
}

function mergeOverrides(
  defaultOverrides: Record<string, DayOverride>,
  parsedOverrides: Record<string, DayOverride> | undefined,
) {
  const merged: Record<string, DayOverride> = {
    ...defaultOverrides,
    ...parsedOverrides,
  };

  for (const [dateKey, defaultOverride] of Object.entries(defaultOverrides)) {
    const parsedOverride = parsedOverrides?.[dateKey];
    if (!parsedOverride || (!defaultOverride.presetAm && !defaultOverride.presetPm)) continue;

    const nextOverride: DayOverride = {
      ...defaultOverride,
      ...parsedOverride,
    };

    if (defaultOverride.presetAm && parsedOverride.am === defaultOverride.presetAm) {
      delete nextOverride.am;
      nextOverride.presetAm = defaultOverride.presetAm;
    }

    if (defaultOverride.presetPm && parsedOverride.pm === defaultOverride.presetPm) {
      delete nextOverride.pm;
      nextOverride.presetPm = defaultOverride.presetPm;
    }

    merged[dateKey] = nextOverride;
  }

  return merged;
}

export function mergeState(parsed: Partial<CCRCalendarState>): CCRCalendarState {
  const defaults = cloneDefaultState();
  return {
    ...defaults,
    ...parsed,
    dayTeams: {
      ...defaults.dayTeams,
      ...parsed.dayTeams,
    },
    cTeams: {
      ...defaults.cTeams,
      ...Object.fromEntries(
        C_TEAM_KEYS.map((key) => {
          const parsedTeam = parsed.cTeams?.[key];
          const defaultTeam = defaults.cTeams[key];
          const members = parsedTeam?.members ?? defaultTeam.members;
          const departments = parsedTeam?.departments
            ? {
                ...defaultTeam.departments,
                ...parsedTeam.departments,
              }
            : cTeamDepartmentsFromMembers(members);
          return [
            key,
            {
              ...defaultTeam,
              ...parsedTeam,
              members,
              departments,
            },
          ];
        }),
      ),
    },
    monthStartWithNight: {
      ...defaults.monthStartWithNight,
      ...parsed.monthStartWithNight,
    },
    monthCTeamKeys: {
      ...defaults.monthCTeamKeys,
      ...parsed.monthCTeamKeys,
    },
    monthCTeams: {
      ...defaults.monthCTeams,
      ...parsed.monthCTeams,
    },
    monthStartPointer: {
      ...defaults.monthStartPointer,
      ...parsed.monthStartPointer,
    },
    monthShiftStartPointer: {
      ...defaults.monthShiftStartPointer,
      ...parsed.monthShiftStartPointer,
    },
    monthStartAnchors: {
      ...defaults.monthStartAnchors,
      ...parsed.monthStartAnchors,
    },
    offDays: {
      ...defaults.offDays,
      ...parsed.offDays,
    },
    overrides: mergeOverrides(defaults.overrides, parsed.overrides),
    comments: {
      ...defaults.comments,
      ...parsed.comments,
    },
    monthMemo: {
      ...defaults.monthMemo,
      ...parsed.monthMemo,
    },
    saturdayOvertime: {
      ...defaults.saturdayOvertime,
      ...parsed.saturdayOvertime,
    },
    serverSave: {
      ...defaults.serverSave,
      ...parsed.serverSave,
    },
    materialRule: {
      ...defaults.materialRule,
      ...parsed.materialRule,
      dateWorkers: {
        ...defaults.materialRule.dateWorkers,
        ...parsed.materialRule?.dateWorkers,
      },
      rotationOrder:
        parsed.materialRule?.rotationOrder ?? defaults.materialRule.rotationOrder,
    },
    sealerRotation: {
      ...defaults.sealerRotation,
      ...parsed.sealerRotation,
    },
    twoWeekTeamRotation: {
      ...defaults.twoWeekTeamRotation,
      ...parsed.twoWeekTeamRotation,
    },
    ui: {
      ...defaults.ui,
      ...parsed.ui,
    },
  };
}

export function loadState(): CCRCalendarState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultState();

    const parsed = JSON.parse(raw) as Partial<CCRCalendarState>;
    if (parsed.version !== 2) return cloneDefaultState();
    return mergeState(parsed);
  } catch {
    return cloneDefaultState();
  }
}

export function saveState(state: CCRCalendarState) {
  const nextState: CCRCalendarState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

export function clearStoredState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportBackup(state: CCRCalendarState) {
  const today = new Date();
  const filename = `CCR캘린더_백업_${toDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )}.json`;
  downloadTextFile(filename, JSON.stringify(state, null, 2));
}

export async function parseBackupFile(file: File) {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<CCRCalendarState>;
  if (parsed.version !== 2) {
    throw new Error('지원하지 않는 백업 파일입니다. version 2 파일만 불러올 수 있습니다.');
  }
  return mergeState(parsed);
}
