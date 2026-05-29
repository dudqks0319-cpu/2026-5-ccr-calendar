import assert from 'node:assert/strict';
import test from 'node:test';
import type { SaveRepository, SaveRow, SaveState } from '../api/_lib/saveCore.js';
import {
  ApiError,
  createSave,
  generateSaveKey,
  isValidSaveKey,
  readSave,
  updateSave,
  validateState,
  verifyPin,
} from '../api/_lib/saveCore.js';

function createMemoryRepository(): SaveRepository & {
  rows: Map<string, SaveRow>;
  failures: Map<string, { failure_count: number; blocked_until: string | null; window_started_at: string }>;
} {
  const rows = new Map<string, SaveRow>();
  const failures = new Map<string, {
    failure_count: number;
    blocked_until: string | null;
    window_started_at: string;
  }>();
  const failureKey = (saveKey: string, clientKey: string) => `${saveKey}:${clientKey}`;
  return {
    rows,
    failures,
    async insertSave({ saveKey, pinHash, state }) {
      const updatedAt = new Date('2026-05-29T00:00:00.000Z');
      rows.set(saveKey, {
        save_key: saveKey,
        pin_hash: pinHash,
        state_json: state,
        updated_at: updatedAt,
        revision: 1,
      });
      return { updatedAt: updatedAt.toISOString() };
    },
    async findSave(saveKey) {
      return rows.get(saveKey) || null;
    },
    async updateSave({ saveKey, state }) {
      const updatedAt = new Date('2026-05-29T01:00:00.000Z');
      const previous = rows.get(saveKey);
      if (!previous) throw new Error('missing row');
      rows.set(saveKey, {
        ...previous,
        state_json: state,
        updated_at: updatedAt,
        revision: previous.revision + 1,
      });
      return { updatedAt: updatedAt.toISOString(), revision: previous.revision + 1 };
    },
    async getPinFailure({ saveKey, clientKey }) {
      const row = failures.get(failureKey(saveKey, clientKey));
      if (!row) return null;
      return {
        failure_count: row.failure_count,
        blocked_until: row.blocked_until,
        window_started_at: row.window_started_at,
      };
    },
    async recordPinFailure({ saveKey, clientKey, failureCount, blockedUntil, windowStartedAt }) {
      failures.set(failureKey(saveKey, clientKey), {
        failure_count: failureCount,
        blocked_until: blockedUntil,
        window_started_at: windowStartedAt,
      });
    },
    async clearPinFailure({ saveKey, clientKey }) {
      failures.delete(failureKey(saveKey, clientKey));
    },
  };
}

function sampleState(extra: SaveState = {}): SaveState {
  return {
    version: 2,
    selectedYear: 2026,
    selectedMonthIndex: 4,
    ...extra,
  };
}

test('saveKey는 ccr_ 접두사와 16자 이상 랜덤 문자열 형식을 가진다', () => {
  const saveKey = generateSaveKey();
  assert.equal(isValidSaveKey(saveKey), true);
  assert.equal(isValidSaveKey('abc_1234567890123456'), false);
  assert.equal(isValidSaveKey('ccr_short'), false);
  assert.equal(isValidSaveKey('ccr_1234567890123456'), true);
});

test('PIN 없는 저장과 불러오기가 동작한다', async () => {
  const repository = createMemoryRepository();
  const created = await createSave(repository, { state: sampleState() }, 500_000);
  const loaded = await readSave(repository, created.saveKey, '');

  assert.equal(isValidSaveKey(created.saveKey), true);
  assert.deepEqual(loaded.state, sampleState());
  assert.equal(loaded.updatedAt, '2026-05-29T00:00:00.000Z');
  assert.equal(loaded.revision, 1);
});

test('PIN 있는 저장은 원문을 저장하지 않고 올바른 PIN으로 불러올 수 있다', async () => {
  const repository = createMemoryRepository();
  const created = await createSave(repository, { state: sampleState(), pin: '1234' }, 500_000);
  const row = repository.rows.get(created.saveKey);

  assert.ok(row?.pin_hash);
  assert.notEqual(row?.pin_hash, '1234');
  assert.equal(verifyPin('1234', row?.pin_hash || null), true);

  const loaded = await readSave(repository, created.saveKey, '1234');
  assert.deepEqual(loaded.state, sampleState());
});

test('잘못된 PIN은 403을 반환한다', async () => {
  const repository = createMemoryRepository();
  const created = await createSave(repository, { state: sampleState(), pin: '1234' }, 500_000);

  await assert.rejects(
    () => readSave(repository, created.saveKey, '0000'),
    (error) => error instanceof ApiError && error.statusCode === 403,
  );
});

test('잘못된 PIN 5회 이상은 429로 차단한다', async () => {
  const repository = createMemoryRepository();
  const created = await createSave(repository, { state: sampleState(), pin: '123456' }, 500_000);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await assert.rejects(
      () => readSave(repository, created.saveKey, '000000', 'client-a'),
      (error) => error instanceof ApiError && error.statusCode === 403,
    );
  }

  await assert.rejects(
    () => readSave(repository, created.saveKey, '000000', 'client-a'),
    (error) => error instanceof ApiError && error.statusCode === 429,
  );

  await assert.rejects(
    () => readSave(repository, created.saveKey, '123456', 'client-a'),
    (error) => error instanceof ApiError && error.statusCode === 429,
  );
});

test('없는 saveKey는 404를 반환한다', async () => {
  const repository = createMemoryRepository();

  await assert.rejects(
    () => readSave(repository, 'ccr_1234567890123456', ''),
    (error) => error instanceof ApiError && error.statusCode === 404,
  );
});

test('state 크기 제한을 초과하면 413을 반환한다', () => {
  assert.throws(
    () => validateState(sampleState({ memo: 'x'.repeat(100) }), 50),
    (error) => error instanceof ApiError && error.statusCode === 413,
  );
});

test('저장키로 수정 후 다시 불러올 수 있다', async () => {
  const repository = createMemoryRepository();
  const created = await createSave(repository, { state: sampleState(), pin: '2468' }, 500_000);
  const updated = await updateSave(
    repository,
    created.saveKey,
    {
      state: sampleState({ selectedMonthIndex: 5 }),
      pin: '2468',
      lastKnownRevision: 1,
    },
    500_000,
  );
  const loaded = await readSave(repository, created.saveKey, '2468');

  assert.equal(updated.updatedAt, '2026-05-29T01:00:00.000Z');
  assert.equal(updated.revision, 2);
  assert.equal(loaded.state.selectedMonthIndex, 5);
  assert.equal(loaded.revision, 2);
});

test('동시 수정 기준 revision이 다르면 409를 반환한다', async () => {
  const repository = createMemoryRepository();
  const created = await createSave(repository, { state: sampleState(), pin: '2468' }, 500_000);

  await updateSave(
    repository,
    created.saveKey,
    {
      state: sampleState({ selectedMonthIndex: 5 }),
      pin: '2468',
      lastKnownRevision: 1,
    },
    500_000,
  );

  await assert.rejects(
    () =>
      updateSave(
        repository,
        created.saveKey,
        {
          state: sampleState({ selectedMonthIndex: 6 }),
          pin: '2468',
          lastKnownRevision: 1,
        },
        500_000,
      ),
    (error) => error instanceof ApiError && error.statusCode === 409,
  );
});
