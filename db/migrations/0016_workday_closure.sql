-- P19: explicit lifecycle, independent of calendar date. Conditional deferred
-- foreign keys enforce the parent/child lifecycle even for competing SQL writers.
ALTER TABLE tawsel.workdays ADD COLUMN is_open boolean GENERATED ALWAYS AS (ended_at IS NULL) STORED;
ALTER TABLE tawsel.workdays ADD UNIQUE (tenant_id,driver_id,workday_id,is_open);
ALTER TABLE tawsel.rounds ADD COLUMN is_active boolean GENERATED ALWAYS AS (CASE WHEN ended_at IS NULL THEN true END) STORED;
ALTER TABLE tawsel.rounds ADD UNIQUE (tenant_id,round_id,is_active);
ALTER TABLE tawsel.rounds ADD CONSTRAINT active_round_open_workday
 FOREIGN KEY (tenant_id,driver_id,workday_id,is_active)
 REFERENCES tawsel.workdays (tenant_id,driver_id,workday_id,is_open) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE tawsel.execution_attempts ADD COLUMN is_current boolean GENERATED ALWAYS AS (CASE WHEN stage IN ('heading','arrived') THEN true END) STORED;
ALTER TABLE tawsel.execution_attempts ADD CONSTRAINT current_requires_active_round
 FOREIGN KEY (tenant_id,round_id,is_current) REFERENCES tawsel.rounds (tenant_id,round_id,is_active) DEFERRABLE INITIALLY DEFERRED;

CREATE OR REPLACE FUNCTION tawsel.retain_round_baseline() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-'ended_at'-'owner_device_id'-'device_generation'-'is_active') IS DISTINCT FROM (to_jsonb(OLD)-'ended_at'-'owner_device_id'-'device_generation'-'is_active')
  OR (OLD.ended_at IS NOT NULL AND ROW(NEW.ended_at,NEW.owner_device_id,NEW.device_generation) IS DISTINCT FROM ROW(OLD.ended_at,OLD.owner_device_id,OLD.device_generation)) THEN
  RAISE EXCEPTION 'round start baseline is immutable; ended round cannot reopen' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE FUNCTION tawsel.retain_workday() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR ROW(NEW.tenant_id,NEW.driver_id,NEW.workday_id,NEW.opened_at) IS DISTINCT FROM ROW(OLD.tenant_id,OLD.driver_id,OLD.workday_id,OLD.opened_at)
  OR (OLD.ended_at IS NOT NULL AND NEW.ended_at IS DISTINCT FROM OLD.ended_at) THEN
  RAISE EXCEPTION 'workday identity and closure are immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER immutable_workday BEFORE UPDATE OR DELETE ON tawsel.workdays FOR EACH ROW EXECUTE FUNCTION tawsel.retain_workday();

CREATE TABLE tawsel.closure_records (
 tenant_id uuid NOT NULL, closure_id uuid NOT NULL, driver_id uuid NOT NULL, workday_id uuid NOT NULL,
 owner_round_id uuid NOT NULL, ended_round_id uuid, operation_id text NOT NULL CHECK(operation_id IN ('round.end','workday.end')),
 source_id uuid NOT NULL, action_id uuid NOT NULL, record jsonb NOT NULL,
 PRIMARY KEY(tenant_id,closure_id), UNIQUE(tenant_id,source_id,action_id), UNIQUE(tenant_id,ended_round_id),
 FOREIGN KEY(tenant_id,driver_id,workday_id) REFERENCES tawsel.workdays(tenant_id,driver_id,workday_id),
 FOREIGN KEY(tenant_id,driver_id,owner_round_id) REFERENCES tawsel.rounds(tenant_id,driver_id,round_id),
 FOREIGN KEY(tenant_id,driver_id,ended_round_id) REFERENCES tawsel.rounds(tenant_id,driver_id,round_id),
 FOREIGN KEY(tenant_id,source_id,action_id) REFERENCES tawsel.command_identities
);
CREATE UNIQUE INDEX one_workday_closure ON tawsel.closure_records(tenant_id,workday_id) WHERE operation_id='workday.end';
CREATE TRIGGER immutable_closure BEFORE UPDATE OR DELETE ON tawsel.closure_records FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
