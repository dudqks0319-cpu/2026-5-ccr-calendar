import { DEFAULT_STATE, STORAGE_KEY } from '../constants/defaults.js';
import { applyJune2026PhotoPreset } from '../constants/june2026Preset.js';
import { applyMay2026PhotoPreset } from '../constants/may2026Preset.js';
import type { CCRCalendarState } from '../types/ccr.js';
import { downloadTextFile, toDateKey } from '../utils/date.js';

function cloneDefaultState(): CCRCalendarState {
  const state = JSON.parse(JSON.stringify(DEFAULT_STATE)) as CCRCalendarState;
  return applyJune2026PhotoPreset(applyMay2026PhotoPreset(state));
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
      ...parsed.cTeams,
    },
    monthStartWithNight: {
      ...defaults.monthStartWithNight,
      ...parsed.monthStartWithNight,
    },
    offDays: {
      ...defaults.offDays,
      ...parsed.offDays,
    },
    overrides: {
      ...defaults.overrides,
      ...parsed.overrides,
    },
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
