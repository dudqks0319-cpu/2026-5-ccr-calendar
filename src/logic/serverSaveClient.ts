import type { CCRCalendarState } from '../types/ccr.js';
import { mergeState } from './storage.js';

type ServerSaveCreateResponse = {
  saveKey: string;
  updatedAt: string;
  revision: number;
};

type ServerSaveLoadResponse = {
  saveKey: string;
  state: CCRCalendarState;
  updatedAt: string;
  revision: number;
};

async function parseServerResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body?.error === 'string'
        ? body.error
        : '서버 저장 처리 중 문제가 발생했습니다.';
    throw new Error(message);
  }
  return body as T;
}

export async function createServerSave(state: CCRCalendarState, pin: string) {
  const response = await fetch('/api/saves/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      state,
      pin: pin || undefined,
    }),
  });

  return parseServerResponse<ServerSaveCreateResponse>(response);
}

export async function loadServerSave(saveKey: string, pin: string) {
  const response = await fetch('/api/saves/load', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      saveKey,
      pin: pin || undefined,
    }),
  });
  const result = await parseServerResponse<ServerSaveLoadResponse>(response);
  return {
    ...result,
    state: mergeState(result.state),
  };
}

export async function updateServerSave(saveKey: string, state: CCRCalendarState, pin: string) {
  const response = await fetch(`/api/saves/${encodeURIComponent(saveKey)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      state,
      pin: pin || undefined,
      lastKnownRevision: state.serverSave.revision || undefined,
    }),
  });

  return parseServerResponse<ServerSaveCreateResponse>(response);
}

export function getInitialSaveKeyFromUrl() {
  if (typeof window === 'undefined') return '';
  const hashValue = window.location.hash.replace(/^#/, '');
  const hashSaveKey = new URLSearchParams(hashValue).get('save_key');
  if (hashSaveKey) return hashSaveKey;
  return new URLSearchParams(window.location.search).get('save_key') || '';
}

export function buildShareUrl(saveKey: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete('save_key');
  url.hash = new URLSearchParams({ save_key: saveKey }).toString();
  return url.toString();
}
