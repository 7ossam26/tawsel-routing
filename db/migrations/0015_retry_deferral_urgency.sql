-- Multiple immutable attempt identities; only the explicit retry command retires
-- a latest identity. Merely reading/planning never creates a retry.
ALTER TABLE tawsel.planning_attempts DROP CONSTRAINT planning_attempts_tenant_id_b2c_task_id_key;
ALTER TABLE tawsel.planning_attempts DROP CONSTRAINT planning_attempts_tenant_id_dispatch_cycle_id_key;
ALTER TABLE tawsel.planning_attempts ADD COLUMN latest boolean NOT NULL DEFAULT true;
ALTER TABLE tawsel.planning_attempts ADD COLUMN previous_attempt_id uuid;
ALTER TABLE tawsel.planning_attempts ADD FOREIGN KEY(tenant_id,previous_attempt_id,task_id) REFERENCES tawsel.planning_attempts(tenant_id,attempt_id,task_id);
CREATE UNIQUE INDEX planning_latest_personal ON tawsel.planning_attempts(tenant_id,b2c_task_id) WHERE latest;
CREATE UNIQUE INDEX planning_latest_cycle ON tawsel.planning_attempts(tenant_id,dispatch_cycle_id) WHERE latest;
CREATE UNIQUE INDEX planning_single_successor ON tawsel.planning_attempts(tenant_id,previous_attempt_id);
CREATE FUNCTION tawsel.retain_planning_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR ROW(NEW.tenant_id,NEW.attempt_id,NEW.task_id,NEW.b2c_task_id,NEW.dispatch_cycle_id,NEW.previous_attempt_id) IS DISTINCT FROM ROW(OLD.tenant_id,OLD.attempt_id,OLD.task_id,OLD.b2c_task_id,OLD.dispatch_cycle_id,OLD.previous_attempt_id) OR (NOT OLD.latest AND NEW.latest) THEN
  RAISE EXCEPTION 'attempt identity/history is immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER immutable_planning_attempt ON tawsel.planning_attempts;
CREATE TRIGGER preserve_planning_attempt BEFORE UPDATE OR DELETE ON tawsel.planning_attempts FOR EACH ROW EXECUTE FUNCTION tawsel.retain_planning_attempt();
CREATE TABLE tawsel.task_execution_options (
 tenant_id uuid NOT NULL, task_id uuid NOT NULL, attempt_id uuid NOT NULL,
 revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),
 earliest_at timestamptz, urgency text CHECK(urgency IN ('ordinary','urgent')),
 deferred boolean NOT NULL DEFAULT false,
 PRIMARY KEY(tenant_id,task_id),
 FOREIGN KEY(tenant_id,attempt_id,task_id) REFERENCES tawsel.planning_attempts(tenant_id,attempt_id,task_id)
);
CREATE TABLE tawsel.task_eligibility_history (
 tenant_id uuid NOT NULL, task_id uuid NOT NULL, revision bigint NOT NULL,
 source_id uuid NOT NULL, action_id uuid NOT NULL, record jsonb NOT NULL,
 PRIMARY KEY(tenant_id,task_id,revision), UNIQUE(tenant_id,source_id,action_id),
 FOREIGN KEY(tenant_id,task_id) REFERENCES tawsel.task_execution_options,
 FOREIGN KEY(tenant_id,source_id,action_id) REFERENCES tawsel.command_identities
);
CREATE TRIGGER preserve_eligibility_history BEFORE UPDATE OR DELETE ON tawsel.task_eligibility_history FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
-- Dependency hook for P21/P22: any confirmed receipt/disposal/redispatch blocks
-- whole retry. Future writers must take the same driver/assignment/task guards
-- and append in their receipt transaction. No receipt command is implemented here.
CREATE TABLE tawsel.retry_dependencies (
 tenant_id uuid NOT NULL, dispatch_cycle_id uuid NOT NULL, dependency_id uuid NOT NULL,
 reason text NOT NULL CHECK(reason IN ('branch-received','lost','damaged','redispatched')),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,dependency_id),
 FOREIGN KEY(tenant_id,dispatch_cycle_id) REFERENCES tawsel.b2b_dispatch_cycles
);
CREATE TRIGGER preserve_retry_dependencies BEFORE UPDATE OR DELETE ON tawsel.retry_dependencies FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
