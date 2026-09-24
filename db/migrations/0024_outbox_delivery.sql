-- Retained recipient streams. Allocation is transactional, after source filtering;
-- the row lock prevents a later committed sequence overtaking an uncommitted one.
CREATE TABLE tawsel.outbox_streams (
 tenant_id uuid NOT NULL, recipient_id uuid NOT NULL,
 aggregate_type text NOT NULL, aggregate_id uuid NOT NULL,
 last_sequence bigint NOT NULL CHECK(last_sequence BETWEEN 1 AND 9007199254740991),
 PRIMARY KEY(tenant_id,recipient_id,aggregate_type,aggregate_id),
 FOREIGN KEY(tenant_id,recipient_id) REFERENCES tawsel.command_sources
);
ALTER TABLE tawsel.outbox_intents ADD COLUMN aggregate_type text;
ALTER TABLE tawsel.outbox_intents ADD COLUMN aggregate_id uuid;
ALTER TABLE tawsel.outbox_intents ADD COLUMN recipient_sequence bigint;

CREATE FUNCTION tawsel.outbox_aggregate(event_type text, payload jsonb, recipient uuid)
RETURNS TABLE(kind text,id uuid) LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE
  WHEN event_type LIKE 'return.%' THEN 'return-request'
  WHEN event_type='workday.ended' THEN 'workday'
  WHEN COALESCE(payload#>>'{task,taskId}',payload#>>'{outcome,taskId}',payload#>>'{correction,outcome,taskId}',payload#>>'{location,taskId}',payload#>>'{change,taskId}',payload->>'taskId') IS NOT NULL THEN 'task'
  WHEN COALESCE(payload->>'roundId',payload->>'endedRoundId') IS NOT NULL THEN 'trip'
  ELSE 'integration' END,
 CASE
  WHEN event_type LIKE 'return.%' THEN COALESCE(payload#>>'{request,requestId}',payload#>>'{transition,requestId}',payload->>'requestId',recipient::text)::uuid
  WHEN event_type='workday.ended' THEN (payload->>'workdayId')::uuid
  ELSE COALESCE(payload#>>'{task,taskId}',payload#>>'{outcome,taskId}',payload#>>'{correction,outcome,taskId}',payload#>>'{location,taskId}',payload#>>'{change,taskId}',payload->>'taskId',payload->>'roundId',payload->>'endedRoundId',recipient::text)::uuid END
$$;

-- Upgrade already committed P05–24 intent, without another business command.
UPDATE tawsel.outbox_intents o SET aggregate_type=a.kind,aggregate_id=a.id
FROM (SELECT tenant_id,event_id,a.* FROM tawsel.outbox_intents
 CROSS JOIN LATERAL tawsel.outbox_aggregate(event_type,payload,recipient_id) a
 WHERE recipient_kind='integration') a WHERE o.tenant_id=a.tenant_id AND o.event_id=a.event_id;
WITH ranked AS (
 SELECT tenant_id,event_id,row_number() OVER(PARTITION BY tenant_id,recipient_id,aggregate_type,aggregate_id ORDER BY created_at,event_id) n
 FROM tawsel.outbox_intents WHERE recipient_kind='integration'
) UPDATE tawsel.outbox_intents o SET recipient_sequence=r.n FROM ranked r WHERE o.tenant_id=r.tenant_id AND o.event_id=r.event_id;
INSERT INTO tawsel.outbox_streams SELECT tenant_id,recipient_id,aggregate_type,aggregate_id,max(recipient_sequence)
 FROM tawsel.outbox_intents WHERE recipient_kind='integration' GROUP BY 1,2,3,4;
ALTER TABLE tawsel.outbox_intents ADD CHECK(recipient_kind<>'integration' OR
 (aggregate_type IS NOT NULL AND aggregate_id IS NOT NULL AND recipient_sequence BETWEEN 1 AND 9007199254740991));
CREATE UNIQUE INDEX outbox_stream_sequence ON tawsel.outbox_intents(tenant_id,recipient_id,aggregate_type,aggregate_id,recipient_sequence) WHERE recipient_kind='integration';

CREATE FUNCTION tawsel.sequence_outbox() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.recipient_kind='integration' THEN
  SELECT kind,id INTO NEW.aggregate_type,NEW.aggregate_id FROM tawsel.outbox_aggregate(NEW.event_type,NEW.payload,NEW.recipient_id);
  INSERT INTO tawsel.outbox_streams VALUES(NEW.tenant_id,NEW.recipient_id,NEW.aggregate_type,NEW.aggregate_id,1)
  ON CONFLICT(tenant_id,recipient_id,aggregate_type,aggregate_id) DO UPDATE SET last_sequence=outbox_streams.last_sequence+1
  RETURNING last_sequence INTO NEW.recipient_sequence;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER outbox_sequence BEFORE INSERT ON tawsel.outbox_intents FOR EACH ROW EXECUTE FUNCTION tawsel.sequence_outbox();

CREATE TABLE tawsel.outbox_endpoints (
 tenant_id uuid NOT NULL, integration_id uuid NOT NULL, url text NOT NULL,
 enabled boolean NOT NULL DEFAULT true, revision bigint NOT NULL DEFAULT 1,
 last_claimed_at timestamptz NOT NULL DEFAULT '-infinity',
 PRIMARY KEY(tenant_id,integration_id), FOREIGN KEY(tenant_id,integration_id) REFERENCES tawsel.integrations
);
CREATE TABLE tawsel.outbox_signing_keys (
 tenant_id uuid NOT NULL, integration_id uuid NOT NULL, key_id text NOT NULL,
 encrypted_secret text NOT NULL, activated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 retired_at timestamptz, verify_until timestamptz,
 PRIMARY KEY(tenant_id,integration_id,key_id), FOREIGN KEY(tenant_id,integration_id) REFERENCES tawsel.integrations,
 CHECK((retired_at IS NULL)=(verify_until IS NULL))
);
CREATE UNIQUE INDEX outbox_active_key ON tawsel.outbox_signing_keys(tenant_id,integration_id) WHERE retired_at IS NULL;
CREATE TABLE tawsel.outbox_deliveries (
 tenant_id uuid NOT NULL,event_id uuid NOT NULL, recipient_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','failed','received')),
 body bytea, attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 lease_id uuid,lease_until timestamptz,last_timestamp bigint,
 received_at timestamptz,last_error text,
 PRIMARY KEY(tenant_id,event_id), FOREIGN KEY(tenant_id,event_id) REFERENCES tawsel.outbox_intents,
 CHECK((status='sending')=(lease_id IS NOT NULL AND lease_until IS NOT NULL))
);
CREATE INDEX outbox_delivery_due ON tawsel.outbox_deliveries(tenant_id,recipient_id,next_attempt_at) WHERE status<>'received';
CREATE TABLE tawsel.outbox_delivery_attempts (
 tenant_id uuid NOT NULL,event_id uuid NOT NULL,attempt_id uuid NOT NULL,attempt_number integer NOT NULL,
 started_at timestamptz NOT NULL DEFAULT clock_timestamp(),finished_at timestamptz,
 key_id text,delivery_timestamp bigint NOT NULL,
 result text NOT NULL CHECK(result IN ('sending','received','failed','lease-expired')),
 error_code text,http_status integer,
 PRIMARY KEY(tenant_id,attempt_id),UNIQUE(tenant_id,event_id,attempt_number),
 FOREIGN KEY(tenant_id,event_id) REFERENCES tawsel.outbox_deliveries
);
INSERT INTO tawsel.outbox_deliveries(tenant_id,event_id,recipient_id)
 SELECT tenant_id,event_id,recipient_id FROM tawsel.outbox_intents WHERE recipient_kind='integration';
CREATE FUNCTION tawsel.enqueue_outbox_delivery() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.recipient_kind='integration' THEN
  INSERT INTO tawsel.outbox_deliveries(tenant_id,event_id,recipient_id) VALUES(NEW.tenant_id,NEW.event_id,NEW.recipient_id);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER outbox_enqueue AFTER INSERT ON tawsel.outbox_intents FOR EACH ROW EXECUTE FUNCTION tawsel.enqueue_outbox_delivery();

CREATE FUNCTION tawsel.protect_outbox_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-'state'-'resolved_at') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'resolved_at') THEN
  RAISE EXCEPTION 'outbox identity and payload are immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER outbox_immutable BEFORE UPDATE OR DELETE ON tawsel.outbox_intents FOR EACH ROW EXECUTE FUNCTION tawsel.protect_outbox_identity();
CREATE FUNCTION tawsel.protect_delivery_body() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR (OLD.body IS NOT NULL AND NEW.body IS DISTINCT FROM OLD.body) THEN
  RAISE EXCEPTION 'delivery bytes are retained and immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER delivery_immutable BEFORE UPDATE OR DELETE ON tawsel.outbox_deliveries FOR EACH ROW EXECUTE FUNCTION tawsel.protect_delivery_body();
