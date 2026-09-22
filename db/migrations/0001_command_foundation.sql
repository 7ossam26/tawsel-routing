-- Scope keys only. Membership, identity provisioning and feature records belong
-- to their later phases. No business entities or Engine objects live here.
CREATE TABLE tawsel.tenant_keys (
  tenant_id uuid PRIMARY KEY
);

CREATE TABLE tawsel.command_sources (
  tenant_id uuid NOT NULL REFERENCES tawsel.tenant_keys,
  source_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('account', 'integration')),
  PRIMARY KEY (tenant_id, source_id),
  UNIQUE (tenant_id, source_id, kind)
);

CREATE TABLE tawsel.command_identities (
  tenant_id uuid NOT NULL,
  source_id uuid NOT NULL,
  action_id uuid NOT NULL,
  operation_id text NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  hash_version smallint NOT NULL DEFAULT 1 CHECK (hash_version = 1),
  actor_id uuid,
  receipt_id uuid NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  business_status text NOT NULL CHECK (business_status IN ('pending', 'accepted', 'rejected', 'review-required')),
  accepted_at timestamptz,
  finalized_at timestamptz,
  response_status integer CHECK (response_status BETWEEN 200 AND 599),
  response_body jsonb,
  result_summary jsonb,
  compacted_at timestamptz,
  -- An explicit hold, plus pending/review status and unresolved outbox, prevents
  -- compaction. No timer deletes identities, audit, evidence or outbox payloads.
  retention_hold boolean NOT NULL DEFAULT false,
  PRIMARY KEY (tenant_id, source_id, action_id),
  FOREIGN KEY (tenant_id, source_id) REFERENCES tawsel.command_sources,
  CHECK ((business_status = 'accepted') = (accepted_at IS NOT NULL)),
  CHECK ((finalized_at IS NOT NULL) = (result_summary IS NOT NULL)),
  CHECK ((response_body IS NOT NULL) = (response_status IS NOT NULL)),
  CHECK (compacted_at IS NULL OR (response_body IS NULL AND finalized_at IS NOT NULL))
);

CREATE TABLE tawsel.command_audit (
  tenant_id uuid NOT NULL,
  source_id uuid NOT NULL,
  action_id uuid NOT NULL,
  audit_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('accepted-change', 'rejected-evidence', 'review-evidence')),
  details jsonb NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, audit_id),
  FOREIGN KEY (tenant_id, source_id, action_id)
    REFERENCES tawsel.command_identities
);

CREATE TABLE tawsel.command_evidence (
  tenant_id uuid NOT NULL,
  source_id uuid NOT NULL,
  action_id uuid NOT NULL,
  envelope jsonb NOT NULL,
  PRIMARY KEY (tenant_id, source_id, action_id),
  FOREIGN KEY (tenant_id, source_id, action_id)
    REFERENCES tawsel.command_identities
);

CREATE TABLE tawsel.outbox_intents (
  tenant_id uuid NOT NULL,
  event_id uuid NOT NULL,
  source_id uuid NOT NULL,
  action_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  recipient_kind text NOT NULL DEFAULT 'integration' CHECK (recipient_kind = 'integration'),
  event_type text NOT NULL,
  payload_version text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  -- Intent only: no sending/received/applied assertion before the P25 worker.
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'resolved')),
  resolved_at timestamptz,
  PRIMARY KEY (tenant_id, event_id),
  FOREIGN KEY (tenant_id, source_id, action_id) REFERENCES tawsel.command_identities,
  FOREIGN KEY (tenant_id, recipient_id, recipient_kind)
    REFERENCES tawsel.command_sources (tenant_id, source_id, kind),
  CHECK ((state = 'resolved') = (resolved_at IS NOT NULL))
);

CREATE INDEX outbox_pending ON tawsel.outbox_intents (created_at, tenant_id, event_id)
  WHERE state = 'pending';
CREATE INDEX outbox_command ON tawsel.outbox_intents (tenant_id, source_id, action_id);
CREATE INDEX command_compaction ON tawsel.command_identities (finalized_at, tenant_id, source_id, action_id)
  WHERE response_body IS NOT NULL AND NOT retention_hold;

-- A durable identity can never be a half-written acquisition, even if a future
-- caller accidentally tries to commit before persisting its result.
CREATE FUNCTION tawsel.require_command_result() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM tawsel.command_identities
    WHERE tenant_id = NEW.tenant_id AND source_id = NEW.source_id AND action_id = NEW.action_id
      AND finalized_at IS NULL) THEN
    RAISE EXCEPTION 'command result must be finalized before commit' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER command_result_required
  AFTER INSERT OR UPDATE ON tawsel.command_identities
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION tawsel.require_command_result();
