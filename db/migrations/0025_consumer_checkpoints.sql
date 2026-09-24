-- Source-scoped current-state caches and separately reported receiver progress.
-- No purge, sender receipt upgrade, or historical application is inferred.
CREATE TABLE tawsel.outbox_projection_snapshots (
 tenant_id uuid NOT NULL, recipient_id uuid NOT NULL, aggregate_type text NOT NULL, aggregate_id uuid NOT NULL,
 through_sequence bigint NOT NULL CHECK(through_sequence>=0), state jsonb NOT NULL,
 captured_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,recipient_id,aggregate_type,aggregate_id),
 FOREIGN KEY(tenant_id,recipient_id,aggregate_type,aggregate_id) REFERENCES tawsel.outbox_streams
);
CREATE TABLE tawsel.outbox_consumer_checkpoints (
 tenant_id uuid NOT NULL, recipient_id uuid NOT NULL, aggregate_type text NOT NULL, aggregate_id uuid NOT NULL,
 revision bigint NOT NULL CHECK(revision>0), checkpoint jsonb NOT NULL,
 reported_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,recipient_id,aggregate_type,aggregate_id),
 FOREIGN KEY(tenant_id,recipient_id,aggregate_type,aggregate_id) REFERENCES tawsel.outbox_streams
);
