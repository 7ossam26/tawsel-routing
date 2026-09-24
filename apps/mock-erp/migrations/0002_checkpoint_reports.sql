-- Transport reports only; native ERP source command outbox is Phase 27.
CREATE TABLE mock_erp.checkpoint_reports (
 aggregate_type text NOT NULL, aggregate_id uuid NOT NULL,
 revision bigint NOT NULL, command jsonb NOT NULL, reported boolean NOT NULL DEFAULT false,
 PRIMARY KEY(aggregate_type,aggregate_id)
);
