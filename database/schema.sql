CREATE TABLE IF NOT EXISTS ccr_calendar_saves (
  save_key text PRIMARY KEY,
  pin_hash text NULL,
  state_json jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ccr_calendar_pin_failures (
  save_key text NOT NULL,
  client_key text NOT NULL,
  failure_count integer NOT NULL DEFAULT 0,
  blocked_until timestamptz NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (save_key, client_key)
);
