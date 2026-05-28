CREATE TABLE IF NOT EXISTS ccr_calendar_saves (
  save_key text PRIMARY KEY,
  pin_hash text NULL,
  state_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
