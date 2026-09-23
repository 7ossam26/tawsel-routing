-- P16: attempt identity was allocated by planning, not by opening a screen.
ALTER TABLE tawsel.planning_states ADD COLUMN physical_origin jsonb;
CREATE TABLE tawsel.round_activity_state (
 tenant_id uuid NOT NULL, round_id uuid NOT NULL,
 revision bigint NOT NULL DEFAULT 0 CHECK (revision BETWEEN 0 AND 9007199254740991),
 PRIMARY KEY (tenant_id,round_id), FOREIGN KEY (tenant_id,round_id) REFERENCES tawsel.rounds
);
CREATE TABLE tawsel.execution_attempts (
 tenant_id uuid NOT NULL, round_id uuid NOT NULL, attempt_id uuid NOT NULL, task_id uuid NOT NULL,
 stage text NOT NULL CHECK (stage IN ('heading','paused','arrived')),
 first_heading jsonb NOT NULL, heading jsonb NOT NULL, arrival jsonb,
 revision bigint NOT NULL CHECK (revision BETWEEN 1 AND 9007199254740991),
 PRIMARY KEY (tenant_id,round_id,attempt_id),
 FOREIGN KEY (tenant_id,round_id,attempt_id) REFERENCES tawsel.round_admissions,
 FOREIGN KEY (tenant_id,attempt_id,task_id) REFERENCES tawsel.planning_attempts (tenant_id,attempt_id,task_id),
 CHECK ((stage='arrived')=(arrival IS NOT NULL))
);
CREATE UNIQUE INDEX one_current_activity ON tawsel.execution_attempts (tenant_id,round_id) WHERE stage IN ('heading','arrived');
CREATE FUNCTION tawsel.retain_attempt_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR ROW(NEW.tenant_id,NEW.round_id,NEW.attempt_id,NEW.task_id,NEW.first_heading) IS DISTINCT FROM ROW(OLD.tenant_id,OLD.round_id,OLD.attempt_id,OLD.task_id,OLD.first_heading)
  OR (OLD.arrival IS NOT NULL AND NEW.arrival IS DISTINCT FROM OLD.arrival) THEN
  RAISE EXCEPTION 'attempt identity and recorded evidence are immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER immutable_attempt_evidence BEFORE UPDATE OR DELETE ON tawsel.execution_attempts FOR EACH ROW EXECUTE FUNCTION tawsel.retain_attempt_evidence();
CREATE TABLE tawsel.current_activity_history (
 tenant_id uuid NOT NULL, round_id uuid NOT NULL, revision bigint NOT NULL CHECK (revision>0),
 source_id uuid NOT NULL, action_id uuid NOT NULL, operation_id text NOT NULL,
 previous_activity jsonb, current_activity jsonb NOT NULL, action_time jsonb NOT NULL,
 PRIMARY KEY (tenant_id,round_id,revision), UNIQUE (tenant_id,source_id,action_id),
 FOREIGN KEY (tenant_id,round_id) REFERENCES tawsel.rounds,
 FOREIGN KEY (tenant_id,source_id,action_id) REFERENCES tawsel.command_identities
);
CREATE TRIGGER immutable_current_history BEFORE UPDATE OR DELETE ON tawsel.current_activity_history FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
-- Driver-scoped: the last confirmed physical origin survives a later round.
CREATE TABLE tawsel.physical_origin_history (
 tenant_id uuid NOT NULL, driver_id uuid NOT NULL, revision bigint NOT NULL CHECK (revision>0),
 round_id uuid NOT NULL, source_id uuid NOT NULL, action_id uuid NOT NULL,
 origin jsonb NOT NULL,
 PRIMARY KEY (tenant_id,driver_id,revision), UNIQUE (tenant_id,source_id,action_id),
 FOREIGN KEY (tenant_id,driver_id,round_id) REFERENCES tawsel.rounds (tenant_id,driver_id,round_id),
 FOREIGN KEY (tenant_id,source_id,action_id) REFERENCES tawsel.command_identities
);
CREATE TRIGGER immutable_physical_origin BEFORE UPDATE OR DELETE ON tawsel.physical_origin_history FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
