import type { CCRCalendarState } from '../types/ccr.js';
import { toDateKey } from '../utils/date.js';
import { mergeState } from './storage.js';

type FilePickerAcceptType = {
  description?: string;
  accept: Record<string, string[]>;
};

type FilePickerOptions = {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
};

type FilePermissionMode = {
  mode: 'read' | 'readwrite';
};

type WritableFileStream = {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
};

export type CCRFileHandle = {
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<WritableFileStream>;
  queryPermission?: (mode: FilePermissionMode) => Promise<PermissionState>;
  requestPermission?: (mode: FilePermissionMode) => Promise<PermissionState>;
};

type FileAccessWindow = Window &
  typeof globalThis & {
    showOpenFilePicker?: (options?: FilePickerOptions) => Promise<CCRFileHandle[]>;
    showSaveFilePicker?: (options?: FilePickerOptions) => Promise<CCRFileHandle>;
  };

const FILE_PICKER_TYPES: FilePickerAcceptType[] = [
  {
    description: 'CCR 캘린더 JSON',
    accept: {
      'application/json': ['.json'],
    },
  },
];

export function supportsLocalFilePersistence() {
  const fileWindow = window as FileAccessWindow;
  return Boolean(fileWindow.showOpenFilePicker && fileWindow.showSaveFilePicker);
}

function buildSaveFileName(state: CCRCalendarState) {
  const today = new Date();
  return `CCR캘린더_저장_${state.selectedYear}_${state.selectedMonthIndex + 1}월_${toDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )}.json`;
}

async function ensureWritePermission(handle: CCRFileHandle) {
  const permissionMode: FilePermissionMode = { mode: 'readwrite' };
  if (!handle.queryPermission || !handle.requestPermission) return true;
  if ((await handle.queryPermission(permissionMode)) === 'granted') return true;
  return (await handle.requestPermission(permissionMode)) === 'granted';
}

export async function writeStateToFileHandle(handle: CCRFileHandle, state: CCRCalendarState) {
  const hasPermission = await ensureWritePermission(handle);
  if (!hasPermission) {
    throw new Error('로컬 저장 파일 쓰기 권한이 거부되었습니다.');
  }

  const writable = await handle.createWritable();
  await writable.write(
    JSON.stringify(
      {
        ...state,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  await writable.close();
}

export async function createLocalSaveFile(state: CCRCalendarState) {
  const fileWindow = window as FileAccessWindow;
  if (!fileWindow.showSaveFilePicker) {
    throw new Error('이 브라우저는 로컬 파일 자동저장을 지원하지 않습니다.');
  }

  const handle = await fileWindow.showSaveFilePicker({
    suggestedName: buildSaveFileName(state),
    types: FILE_PICKER_TYPES,
    excludeAcceptAllOption: false,
  });
  await writeStateToFileHandle(handle, state);
  return handle;
}

export async function openLocalSaveFile() {
  const fileWindow = window as FileAccessWindow;
  if (!fileWindow.showOpenFilePicker) {
    throw new Error('이 브라우저는 로컬 저장 파일 열기를 지원하지 않습니다.');
  }

  const [handle] = await fileWindow.showOpenFilePicker({
    types: FILE_PICKER_TYPES,
    excludeAcceptAllOption: false,
  });
  if (!handle) {
    throw new Error('선택된 저장 파일이 없습니다.');
  }

  const file = await handle.getFile();
  const parsed = JSON.parse(await file.text()) as Partial<CCRCalendarState>;
  if (parsed.version !== 2) {
    throw new Error('지원하지 않는 저장 파일입니다. version 2 파일만 불러올 수 있습니다.');
  }

  return {
    handle,
    state: mergeState(parsed),
  };
}
