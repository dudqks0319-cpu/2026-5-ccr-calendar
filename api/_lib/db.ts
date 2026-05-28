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
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `).then(() => undefined);
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
          SELECT save_key, pin_hash, state_json, updated_at
          FROM ccr_calendar_saves
          WHERE save_key = $1
        `,
        [saveKey],
      );
      return result.rows[0] || null;
    },

    async updateSave({ saveKey, state }) {
      await ensureSchema();
      const result = await getPool().query<{ updated_at: Date }>(
        `
          UPDATE ccr_calendar_saves
          SET state_json = $2::jsonb,
              updated_at = now()
          WHERE save_key = $1
          RETURNING updated_at
        `,
        [saveKey, JSON.stringify(state)],
      );
      return {
        updatedAt: result.rows[0].updated_at.toISOString(),
      };
    },
  };
}
