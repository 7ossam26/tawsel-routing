-- P15: publication is separate from immutable ready/manual planning history.
CREATE TABLE tawsel.workdays (
 tenant_id uuid NOT NULL, driver_id uuid NOT NULL, workday_id uuid NOT NULL,
 opened_at timestamptz NOT NULL DEFAULT clock_timestamp(), ended_at timestamptz,
 PRIMARY KEY (tenant_id,workday_id), UNIQUE (tenant_id,driver_id,workday_id),
 FOREIGN KEY (tenant_id,driver_id) REFERENCES tawsel.drivers,
 CHECK (ended_at IS NULL OR ended_at>=opened_at)
);
CREATE UNIQUE INDEX one_open_workday ON tawsel.workdays (tenant_id,driver_id) WHERE ended_at IS NULL;
ALTER TABLE tawsel.forecast_revisions ADD UNIQUE (tenant_id,plan_id,forecast_id,workload_id);
CREATE TABLE tawsel.start_readiness (
 tenant_id uuid NOT NULL, driver_id uuid NOT NULL, readiness_id uuid NOT NULL,
 account_id uuid NOT NULL, device_id uuid NOT NULL, plan_id uuid NOT NULL,
 fingerprint text NOT NULL, relevant_action_ids uuid[] NOT NULL,
 issued_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz NOT NULL,
 PRIMARY KEY (tenant_id,readiness_id),
 FOREIGN KEY (tenant_id,account_id) REFERENCES tawsel.accounts,
 FOREIGN KEY (tenant_id,driver_id,plan_id) REFERENCES tawsel.plan_revisions (tenant_id,driver_id,plan_id),
 CHECK (expires_at>issued_at)
);
CREATE TRIGGER immutable_start_readiness BEFORE UPDATE OR DELETE ON tawsel.start_readiness FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE TABLE tawsel.rounds (
 tenant_id uuid NOT NULL, driver_id uuid NOT NULL, round_id uuid NOT NULL, workday_id uuid NOT NULL,
 owner_account_id uuid NOT NULL, owner_device_id uuid NOT NULL, device_generation bigint NOT NULL CHECK (device_generation BETWEEN 1 AND 9007199254740991),
 first_plan_id uuid NOT NULL, first_forecast_id uuid NOT NULL, first_workload_id uuid NOT NULL,
 readiness_id uuid NOT NULL, source_id uuid NOT NULL, action_id uuid NOT NULL,
 started_at timestamptz NOT NULL DEFAULT clock_timestamp(), ended_at timestamptz,
 PRIMARY KEY (tenant_id,round_id), UNIQUE (tenant_id,driver_id,round_id), UNIQUE (tenant_id,source_id,action_id),
 FOREIGN KEY (tenant_id,driver_id,workday_id) REFERENCES tawsel.workdays (tenant_id,driver_id,workday_id),
 FOREIGN KEY (tenant_id,owner_account_id) REFERENCES tawsel.accounts,
 FOREIGN KEY (tenant_id,driver_id,first_plan_id) REFERENCES tawsel.plan_revisions (tenant_id,driver_id,plan_id),
 FOREIGN KEY (tenant_id,first_plan_id,first_forecast_id,first_workload_id) REFERENCES tawsel.forecast_revisions (tenant_id,plan_id,forecast_id,workload_id),
 FOREIGN KEY (tenant_id,readiness_id) REFERENCES tawsel.start_readiness,
 FOREIGN KEY (tenant_id,source_id,action_id) REFERENCES tawsel.command_identities,
 CHECK (ended_at IS NULL OR ended_at>=started_at)
);
CREATE UNIQUE INDEX one_active_round ON tawsel.rounds (tenant_id,driver_id) WHERE ended_at IS NULL;
CREATE TABLE tawsel.round_publications (
 tenant_id uuid NOT NULL, driver_id uuid NOT NULL, round_id uuid NOT NULL, plan_id uuid NOT NULL,
 published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id,round_id),
 FOREIGN KEY (tenant_id,driver_id,round_id) REFERENCES tawsel.rounds (tenant_id,driver_id,round_id),
 FOREIGN KEY (tenant_id,driver_id,plan_id) REFERENCES tawsel.plan_revisions (tenant_id,driver_id,plan_id)
);
CREATE TRIGGER immutable_round_publication BEFORE UPDATE OR DELETE ON tawsel.round_publications FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE TABLE tawsel.round_admissions (
 tenant_id uuid NOT NULL, driver_id uuid NOT NULL, round_id uuid NOT NULL, task_id uuid NOT NULL, attempt_id uuid NOT NULL,
 dispatch_cycle_id uuid, source_revision bigint NOT NULL, assignment_revision bigint NOT NULL, pin_revision bigint NOT NULL,
 boundary text NOT NULL CHECK (boundary IN ('start','active-admission')),
 source_id uuid NOT NULL, action_id uuid NOT NULL, admitted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id,round_id,attempt_id),
 FOREIGN KEY (tenant_id,driver_id,round_id) REFERENCES tawsel.rounds (tenant_id,driver_id,round_id),
 FOREIGN KEY (tenant_id,attempt_id,task_id) REFERENCES tawsel.planning_attempts (tenant_id,attempt_id,task_id),
 FOREIGN KEY (tenant_id,dispatch_cycle_id) REFERENCES tawsel.b2b_dispatch_cycles,
 FOREIGN KEY (tenant_id,source_id,action_id) REFERENCES tawsel.command_identities
);
CREATE TRIGGER immutable_round_admission BEFORE UPDATE OR DELETE ON tawsel.round_admissions FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE FUNCTION tawsel.retain_round_baseline() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-'ended_at'-'owner_device_id'-'device_generation') IS DISTINCT FROM (to_jsonb(OLD)-'ended_at'-'owner_device_id'-'device_generation') THEN
  RAISE EXCEPTION 'round start baseline is immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER immutable_round_baseline BEFORE UPDATE OR DELETE ON tawsel.rounds FOR EACH ROW EXECUTE FUNCTION tawsel.retain_round_baseline();
