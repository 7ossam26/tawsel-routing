-- P13: candidate drafts only. No workday, active round or first-start baseline.
CREATE TABLE tawsel.planning_states (
 tenant_id uuid NOT NULL, driver_id uuid NOT NULL,
 settings_revision bigint NOT NULL DEFAULT 0 CHECK (settings_revision BETWEEN 0 AND 9007199254740991),
 settings jsonb,
 input_revision bigint NOT NULL DEFAULT 0 CHECK (input_revision BETWEEN 0 AND 9007199254740991),
 execution_revision bigint NOT NULL DEFAULT 0 CHECK (execution_revision BETWEEN 0 AND 9007199254740991),
 manual_revision bigint NOT NULL DEFAULT 0 CHECK (manual_revision BETWEEN 0 AND 9007199254740991),
 current_target jsonb,
 next_plan_revision bigint NOT NULL DEFAULT 1 CHECK (next_plan_revision BETWEEN 1 AND 9007199254740991),
 latest_job_id uuid, current_plan_id uuid,
 PRIMARY KEY (tenant_id,driver_id), FOREIGN KEY (tenant_id,driver_id) REFERENCES tawsel.drivers
);
-- Allocating an attempt identity does not assert heading, arrival or an outcome.
CREATE TABLE tawsel.planning_attempts (
 tenant_id uuid NOT NULL, attempt_id uuid NOT NULL, task_id uuid NOT NULL,
 b2c_task_id uuid, dispatch_cycle_id uuid,
 PRIMARY KEY (tenant_id,attempt_id), UNIQUE (tenant_id,attempt_id,task_id), UNIQUE (tenant_id,b2c_task_id), UNIQUE (tenant_id,dispatch_cycle_id),
 FOREIGN KEY (tenant_id,b2c_task_id) REFERENCES tawsel.b2c_tasks,
 FOREIGN KEY (tenant_id,dispatch_cycle_id) REFERENCES tawsel.b2b_dispatch_cycles,
 CHECK (num_nonnulls(b2c_task_id,dispatch_cycle_id)=1), CHECK (b2c_task_id IS NULL OR b2c_task_id=task_id)
);
CREATE TABLE tawsel.planning_jobs (
 tenant_id uuid NOT NULL, driver_id uuid NOT NULL, job_id uuid NOT NULL,
 source_id uuid NOT NULL, action_id uuid NOT NULL,
 fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'), input jsonb NOT NULL,
 status text NOT NULL CHECK (status IN ('pending','running','complete','partial','failed','superseded')),
 blocked_reason text, attempts integer NOT NULL DEFAULT 0 CHECK (attempts>=0),
 lease_id uuid, lease_until timestamptz, next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 last_error jsonb, candidate jsonb, plan_id uuid,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), finished_at timestamptz,
 PRIMARY KEY (tenant_id,job_id), UNIQUE (tenant_id,driver_id,job_id), UNIQUE (tenant_id,driver_id,fingerprint),
 FOREIGN KEY (tenant_id,driver_id) REFERENCES tawsel.planning_states,
 FOREIGN KEY (tenant_id,source_id,action_id) REFERENCES tawsel.command_identities,
 CHECK ((status='running' AND lease_id IS NOT NULL AND lease_until IS NOT NULL) OR (status<>'running' AND lease_id IS NULL AND lease_until IS NULL)),
 CHECK ((status IN ('complete','partial','failed','superseded'))=(finished_at IS NOT NULL)),
 CHECK ((status IN ('complete','partial'))=(plan_id IS NOT NULL))
);
CREATE UNIQUE INDEX planning_one_pending ON tawsel.planning_jobs (tenant_id,driver_id) WHERE status='pending';
CREATE UNIQUE INDEX planning_one_running ON tawsel.planning_jobs (tenant_id,driver_id) WHERE status='running';
CREATE INDEX planning_due ON tawsel.planning_jobs (next_attempt_at,created_at) WHERE status IN ('pending','running');
CREATE TABLE tawsel.planning_job_attempts (
 tenant_id uuid NOT NULL, job_id uuid NOT NULL, lease_id uuid NOT NULL, attempt integer NOT NULL,
 claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(), lease_until timestamptz NOT NULL,
 PRIMARY KEY (tenant_id,job_id,attempt), UNIQUE (tenant_id,lease_id),
 FOREIGN KEY (tenant_id,job_id) REFERENCES tawsel.planning_jobs
);
CREATE TABLE tawsel.plan_revisions (
 tenant_id uuid NOT NULL, driver_id uuid NOT NULL, plan_id uuid NOT NULL, job_id uuid NOT NULL,
 revision bigint NOT NULL CHECK (revision>0), fingerprint text NOT NULL,
 state text NOT NULL DEFAULT 'draft' CHECK (state='draft'),
 candidate jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id,plan_id), UNIQUE (tenant_id,driver_id,plan_id), UNIQUE (tenant_id,job_id), UNIQUE (tenant_id,driver_id,revision),
 FOREIGN KEY (tenant_id,driver_id,job_id) REFERENCES tawsel.planning_jobs (tenant_id,driver_id,job_id)
);
CREATE TABLE tawsel.forecast_revisions (
 tenant_id uuid NOT NULL, forecast_id uuid NOT NULL, plan_id uuid NOT NULL, workload_id uuid NOT NULL,
 time_origin timestamptz NOT NULL, expected_finish_at timestamptz,
 kind text NOT NULL DEFAULT 'planning-estimate' CHECK (kind='planning-estimate'),
 PRIMARY KEY (tenant_id,forecast_id), UNIQUE (tenant_id,plan_id), UNIQUE (tenant_id,workload_id),
 FOREIGN KEY (tenant_id,plan_id) REFERENCES tawsel.plan_revisions
);
CREATE TABLE tawsel.forecast_members (
 tenant_id uuid NOT NULL, forecast_id uuid NOT NULL, attempt_id uuid NOT NULL, task_id uuid NOT NULL,
 dispatch_cycle_id uuid, source_revision bigint NOT NULL, assignment_revision bigint NOT NULL, pin_revision bigint NOT NULL,
 membership text NOT NULL CHECK (membership IN ('assigned','unassigned','excluded')),
 exclusion_reason text, position integer, expected_arrival_at timestamptz, expected_completion_at timestamptz,
 PRIMARY KEY (tenant_id,forecast_id,attempt_id), UNIQUE (tenant_id,forecast_id,position),
 FOREIGN KEY (tenant_id,forecast_id) REFERENCES tawsel.forecast_revisions,
 FOREIGN KEY (tenant_id,attempt_id,task_id) REFERENCES tawsel.planning_attempts (tenant_id,attempt_id,task_id),
 CHECK ((membership='assigned')=(position IS NOT NULL AND expected_arrival_at IS NOT NULL AND expected_completion_at IS NOT NULL))
);
ALTER TABLE tawsel.planning_jobs ADD FOREIGN KEY (tenant_id,driver_id,plan_id) REFERENCES tawsel.plan_revisions (tenant_id,driver_id,plan_id);
ALTER TABLE tawsel.planning_states ADD FOREIGN KEY (tenant_id,driver_id,latest_job_id) REFERENCES tawsel.planning_jobs (tenant_id,driver_id,job_id);
ALTER TABLE tawsel.planning_states ADD FOREIGN KEY (tenant_id,driver_id,current_plan_id) REFERENCES tawsel.plan_revisions (tenant_id,driver_id,plan_id);
ALTER TABLE tawsel.intake_replan_intents DROP CONSTRAINT intake_replan_intents_status_check;
ALTER TABLE tawsel.intake_replan_intents ADD COLUMN job_id uuid;
ALTER TABLE tawsel.intake_replan_intents ADD CHECK (status IN ('pending','linked'));
ALTER TABLE tawsel.intake_replan_intents ADD FOREIGN KEY (tenant_id,driver_id,job_id) REFERENCES tawsel.planning_jobs (tenant_id,driver_id,job_id);
ALTER TABLE tawsel.intake_replan_intents ADD CHECK ((status='linked')=(job_id IS NOT NULL));
-- Upgrade retained B2C work into inspectable intent; worker snapshots it under locks.
INSERT INTO tawsel.intake_replan_intents (tenant_id,driver_id,source_id,action_id)
 SELECT t.tenant_id,t.driver_id,e.source_id,e.action_id FROM tawsel.b2c_tasks t
 JOIN tawsel.task_intake_events e USING (tenant_id,task_id,revision) ON CONFLICT DO NOTHING;
CREATE FUNCTION tawsel.retain_planning_input() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR NEW.input IS DISTINCT FROM OLD.input OR NEW.fingerprint IS DISTINCT FROM OLD.fingerprint
 OR NEW.tenant_id<>OLD.tenant_id OR NEW.driver_id<>OLD.driver_id OR NEW.job_id<>OLD.job_id
 OR NEW.source_id<>OLD.source_id OR NEW.action_id<>OLD.action_id THEN
  RAISE EXCEPTION 'planning input is immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER immutable_planning_input BEFORE UPDATE OR DELETE ON tawsel.planning_jobs FOR EACH ROW EXECUTE FUNCTION tawsel.retain_planning_input();
CREATE TRIGGER immutable_plan BEFORE UPDATE OR DELETE ON tawsel.plan_revisions FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE TRIGGER immutable_forecast BEFORE UPDATE OR DELETE ON tawsel.forecast_revisions FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE TRIGGER immutable_forecast_member BEFORE UPDATE OR DELETE ON tawsel.forecast_members FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE TRIGGER immutable_job_attempt BEFORE UPDATE OR DELETE ON tawsel.planning_job_attempts FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE TRIGGER immutable_planning_attempt BEFORE UPDATE OR DELETE ON tawsel.planning_attempts FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
