import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export type SaveState = Record<string, unknown>;

export type SaveRow = {
  save_key: string;
  pin_hash: string | null;
  state_json: SaveState;
  updated_at: Date | string;
};

export type SaveRepository = {
  insertSave: (input: {
    saveKey: string;
    pinHash: string | null;
    state: SaveState;
  }) => Promise<{ updatedAt: string }>;
  findSave: (saveKey: string) => Promise<SaveRow | null>;
  updateSave: (input: {
    saveKey: string;
    state: SaveState;
  }) => Promise<{ updatedAt: string }>;
};

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export const SAVE_KEY_PATTERN = /^ccr_[A-Za-z0-9_-]{16,}$/;
const SAVE_KEY_RANDOM_BYTES = 18;
const DEFAULT_MAX_BYTES = 500_000;
const MAX_PIN_LENGTH = 128;
const SCRYPT_KEY_LENGTH = 32;
const SCRYPT_OPTIONS = {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
} as const;

export function generateSaveKey() {
  return `ccr_${randomBytes(SAVE_KEY_RANDOM_BYTES).toString('base64url')}`;
}

export function isValidSaveKey(saveKey: string) {
  return SAVE_KEY_PATTERN.test(saveKey);
}

export function getServerSaveMaxBytes(env = process.env) {
  const rawValue = env.SERVER_SAVE_MAX_BYTES;
  const parsed = rawValue ? Number(rawValue) : DEFAULT_MAX_BYTES;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_BYTES;
}

export function getJsonByteLength(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

export function normalizePin(pin: unknown) {
  if (pin === undefined || pin === null || pin === '') return '';
  if (typeof pin !== 'string') {
    throw new ApiError(400, 'PIN 형식이 올바르지 않습니다.');
  }
  if (pin.length > MAX_PIN_LENGTH) {
    throw new ApiError(400, 'PIN은 128자 이하로 입력해주세요.');
  }
  return pin;
}

export function validateSaveKey(saveKey: unknown) {
  if (typeof saveKey !== 'string' || !isValidSaveKey(saveKey)) {
    throw new ApiError(400, '저장키 형식이 올바르지 않습니다.');
  }
  return saveKey;
}

export function validateState(state: unknown, maxBytes = getServerSaveMaxBytes()) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new ApiError(400, '저장할 근무표 데이터가 올바르지 않습니다.');
  }
  const size = getJsonByteLength(state);
  if (size > maxBytes) {
    throw new ApiError(413, '근무표 데이터가 너무 큽니다.');
  }
  return state as SaveState;
}

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString('base64url');
  const digest = scryptSync(pin, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS).toString('base64url');
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt}$${digest}`;
}

export function verifyPin(pin: string, storedHash: string | null) {
  if (!storedHash) return true;
  const [algorithm, nValue, rValue, pValue, salt, digest] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !nValue || !rValue || !pValue || !salt || !digest) {
    return false;
  }

  const expected = Buffer.from(digest, 'base64url');
  const actual = scryptSync(pin, salt, expected.length, {
    N: Number(nValue),
    r: Number(rValue),
    p: Number(pValue),
    maxmem: 64 * 1024 * 1024,
  });

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function assertPinAccess(row: SaveRow, pin: unknown) {
  const normalizedPin = normalizePin(pin);
  if (!verifyPin(normalizedPin, row.pin_hash)) {
    throw new ApiError(403, 'PIN이 올바르지 않습니다.');
  }
}

export function toIsoDate(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function createSave(
  repository: SaveRepository,
  body: unknown,
  maxBytes = getServerSaveMaxBytes(),
) {
  const input = parseBodyObject(body);
  const state = validateState(input.state, maxBytes);
  const pin = normalizePin(input.pin);
  const saveKey = generateSaveKey();
  const pinHash = pin ? hashPin(pin) : null;
  const result = await repository.insertSave({ saveKey, pinHash, state });
  return {
    saveKey,
    updatedAt: result.updatedAt,
  };
}

export async function readSave(repository: SaveRepository, saveKeyInput: unknown, pinInput: unknown) {
  const saveKey = validateSaveKey(saveKeyInput);
  const row = await repository.findSave(saveKey);
  if (!row) throw new ApiError(404, '저장키를 찾을 수 없습니다.');
  assertPinAccess(row, pinInput);
  return {
    saveKey: row.save_key,
    state: row.state_json,
    updatedAt: toIsoDate(row.updated_at),
  };
}

export async function updateSave(
  repository: SaveRepository,
  saveKeyInput: unknown,
  body: unknown,
  maxBytes = getServerSaveMaxBytes(),
) {
  const saveKey = validateSaveKey(saveKeyInput);
  const input = parseBodyObject(body);
  const state = validateState(input.state, maxBytes);
  const row = await repository.findSave(saveKey);
  if (!row) throw new ApiError(404, '저장키를 찾을 수 없습니다.');
  assertPinAccess(row, input.pin);
  const result = await repository.updateSave({ saveKey, state });
  return {
    saveKey,
    updatedAt: result.updatedAt,
  };
}

function parseBodyObject(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, '요청 본문이 올바르지 않습니다.');
  }
  return body as Record<string, unknown>;
}
