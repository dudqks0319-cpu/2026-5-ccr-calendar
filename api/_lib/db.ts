import pg from 'pg';
import type { SaveRepository, SaveRow } from './saveCore.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return pool;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS ccr_calendar_saves (
        save_key text PRIMARY KEY,
        pin_hash text NULL,
        state_json jsonb NOT NULL,
        revision integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)
      .then(() =>
        getPool().query(`
          ALTER TABLE ccr_calendar_saves
          ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1
        `),
      )
      .then(() =>
        getPool().query(`
          CREATE TABLE IF NOT EXISTS ccr_calendar_pin_failures (
            save_key text NOT NULL,
            client_key text NOT NULL,
            failure_count integer NOT NULL DEFAULT 0,
            blocked_until timestamptz NULL,
            window_started_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY (save_key, client_key)
          )
        `),
      )
      .then(() => undefined);
  }

  return schemaReady;
}

export function createPostgresSaveRepository(): SaveRepository {
  return {
    async insertSave({ saveKey, pinHash, state }) {
      await ensureSchema();
      const result = await getPool().query<{ updated_at: Date }>(
        `
          INSERT INTO ccr_calendar_saves (save_key, pin_hash, state_json)
          VALUES ($1, $2, $3::jsonb)
          RETURNING updated_at
        `,
        [saveKey, pinHash, JSON.stringify(state)],
      );
      return {
        updatedAt: result.rows[0].updated_at.toISOString(),
      };
    },

    async findSave(saveKey) {
      await ensureSchema();
      const result = await getPool().query<SaveRow>(
        `
          SELECT save_key, pin_hash, state_json, updated_at, revision
          FROM ccr_calendar_saves
          WHERE save_key = $1
        `,
        [saveKey],
      );
      return result.rows[0] || null;
    },

    async updateSave({ saveKey, state }) {
      await ensureSchema();
      const result = await getPool().query<{ updated_at: Date; revision: number }>(
        `
          UPDATE ccr_calendar_saves
          SET state_json = $2::jsonb,
              revision = revision + 1,
              updated_at = now()
          WHERE save_key = $1
          RETURNING updated_at, revision
        `,
        [saveKey, JSON.stringify(state)],
      );
      return {
        updatedAt: result.rows[0].updated_at.toISOString(),
        revision: result.rows[0].revision,
      };
    },

    async getPinFailure({ saveKey, clientKey }) {
      await ensureSchema();
      const result = await getPool().query<{
        failure_count: number;
        blocked_until: Date | null;
        window_started_at: Date;
      }>(
        `
          SELECT failure_count, blocked_until, window_started_at
          FROM ccr_calendar_pin_failures
          WHERE save_key = $1 AND client_key = $2
        `,
        [saveKey, clientKey],
      );
      return result.rows[0] || null;
    },

    async recordPinFailure({
      saveKey,
      clientKey,
      failureCount,
      blockedUntil,
      windowStartedAt,
    }) {
      await ensureSchema();
      await getPool().query(
        `
          INSERT INTO ccr_calendar_pin_failures (
            save_key,
            client_key,
            failure_count,
            blocked_until,
            window_started_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, now())
          ON CONFLICT (save_key, client_key)
          DO UPDATE SET
            failure_count = EXCLUDED.failure_count,
            blocked_until = EXCLUDED.blocked_until,
            window_started_at = EXCLUDED.window_started_at,
            updated_at = now()
        `,
        [saveKey, clientKey, failureCount, blockedUntil, windowStartedAt],
      );
    },

    async clearPinFailure({ saveKey, clientKey }) {
      await ensureSchema();
      await getPool().query(
        `
          DELETE FROM ccr_calendar_pin_failures
          WHERE save_key = $1 AND client_key = $2
        `,
        [saveKey, clientKey],
      );
    },
  };
}
