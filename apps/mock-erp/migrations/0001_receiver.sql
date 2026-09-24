CREATE TABLE mock_erp.scope (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), tenant_id uuid NOT NULL, integration_id uuid NOT NULL,
 revision bigint NOT NULL DEFAULT 1
);
CREATE TABLE mock_erp.streams (
 aggregate_type text NOT NULL, aggregate_id uuid NOT NULL,
 cursor_sequence bigint NOT NULL DEFAULT 0, snapshot_sequence bigint NOT NULL DEFAULT 0,
 state jsonb, last_error text, updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(aggregate_type,aggregate_id),
 CHECK(cursor_sequence>=snapshot_sequence AND snapshot_sequence>=0)
);
CREATE TABLE mock_erp.inbox (
 event_id uuid PRIMARY KEY, aggregate_type text NOT NULL, aggregate_id uuid NOT NULL, sequence bigint NOT NULL CHECK(sequence>0),
 envelope jsonb NOT NULL, semantic_hash text NOT NULL, wire_body bytea,
 received_at timestamptz NOT NULL DEFAULT clock_timestamp(), applied_at timestamptz,
 error_code text, attempts integer NOT NULL DEFAULT 0,
 UNIQUE(aggregate_type,aggregate_id,sequence),
 FOREIGN KEY(aggregate_type,aggregate_id) REFERENCES mock_erp.streams
);
CREATE TABLE mock_erp.mismatches (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, event_id uuid NOT NULL,
 incoming_hash text NOT NULL, reason text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- This is received business-event history, never fabricated by a snapshot.
CREATE TABLE mock_erp.transitions (
 event_id uuid PRIMARY KEY REFERENCES mock_erp.inbox, event_type text NOT NULL,
 payload jsonb NOT NULL, applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE mock_erp.reconciliations (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 aggregate_type text NOT NULL, aggregate_id uuid NOT NULL, through_sequence bigint NOT NULL,
 snapshot jsonb NOT NULL, adopted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
