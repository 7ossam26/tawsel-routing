-- One bounded row per worker kind; evidence of recent completed loops, not queue success.
CREATE TABLE tawsel.worker_observations (
 worker text PRIMARY KEY CHECK (worker IN ('planning','outbox','provisioning')),
 observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 worked boolean NOT NULL,
 elapsed_ms double precision NOT NULL CHECK (elapsed_ms >= 0)
);
