-- P22: one explicit branch segment inside the existing active round.
CREATE TABLE tawsel.branch_activities (
 tenant_id uuid NOT NULL, segment_id uuid NOT NULL, round_id uuid NOT NULL,
 driver_id uuid NOT NULL, request_id uuid NOT NULL, active boolean NOT NULL,
 record jsonb NOT NULL,
 PRIMARY KEY(tenant_id,segment_id),
 FOREIGN KEY(tenant_id,driver_id,round_id) REFERENCES tawsel.rounds(tenant_id,driver_id,round_id),
 FOREIGN KEY(tenant_id,request_id) REFERENCES tawsel.return_requests
);
CREATE UNIQUE INDEX one_branch_activity ON tawsel.branch_activities(tenant_id,driver_id) WHERE active;
ALTER TABLE tawsel.branch_activities ADD COLUMN requires_active_round boolean GENERATED ALWAYS AS (CASE WHEN active THEN true END) STORED;
ALTER TABLE tawsel.branch_activities ADD FOREIGN KEY(tenant_id,round_id,requires_active_round) REFERENCES tawsel.rounds(tenant_id,round_id,is_active) DEFERRABLE INITIALLY DEFERRED;
CREATE FUNCTION tawsel.check_round_activity_mode() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM tawsel.branch_activities b JOIN tawsel.execution_attempts e USING(tenant_id,round_id) WHERE b.tenant_id=NEW.tenant_id AND b.round_id=NEW.round_id AND b.active AND e.stage IN ('heading','arrived')) THEN
 RAISE EXCEPTION 'branch and customer activity cannot coexist' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER branch_excludes_customer AFTER INSERT OR UPDATE ON tawsel.branch_activities DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION tawsel.check_round_activity_mode();
CREATE CONSTRAINT TRIGGER customer_excludes_branch AFTER INSERT OR UPDATE ON tawsel.execution_attempts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION tawsel.check_round_activity_mode();
CREATE TABLE tawsel.branch_activity_history (
 tenant_id uuid NOT NULL, segment_id uuid NOT NULL, revision bigint NOT NULL CHECK(revision>0),
 source_id uuid NOT NULL, action_id uuid NOT NULL, record jsonb NOT NULL,
 PRIMARY KEY(tenant_id,segment_id,revision), UNIQUE(tenant_id,source_id,action_id),
 FOREIGN KEY(tenant_id,segment_id) REFERENCES tawsel.branch_activities,
 FOREIGN KEY(tenant_id,source_id,action_id) REFERENCES tawsel.command_identities
);
CREATE TRIGGER preserve_branch_history BEFORE UPDATE OR DELETE ON tawsel.branch_activity_history
 FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
ALTER TABLE tawsel.plan_revisions DROP CONSTRAINT plan_revisions_state_check;
ALTER TABLE tawsel.plan_revisions ADD CHECK(state IN ('draft','ready','partial','manual','branch'));
-- Find the P14 publication-shape check by its definition, preserving the other checks.
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='tawsel.plan_revisions'::regclass AND contype='c'
 AND pg_get_constraintdef(oid) LIKE '%job_id IS NULL%' LOOP
 EXECUTE format('ALTER TABLE tawsel.plan_revisions DROP CONSTRAINT %I',c.conname);
 END LOOP;
END $$;
ALTER TABLE tawsel.plan_revisions ADD CHECK(
 (state IN ('manual','branch') AND job_id IS NULL AND candidate IS NULL AND input IS NOT NULL AND source_id IS NOT NULL AND action_id IS NOT NULL)
 OR (state NOT IN ('manual','branch') AND job_id IS NOT NULL AND candidate IS NOT NULL AND input IS NULL AND source_id IS NULL AND action_id IS NULL));
ALTER TABLE tawsel.forecast_members DROP CONSTRAINT forecast_members_membership_check;
ALTER TABLE tawsel.forecast_members DROP CONSTRAINT forecast_members_check;
ALTER TABLE tawsel.forecast_members ADD CHECK(membership IN ('assigned','manual','paused','unassigned','excluded'));
ALTER TABLE tawsel.forecast_members ADD CHECK(
 (membership='assigned' AND position IS NOT NULL AND expected_arrival_at IS NOT NULL AND expected_completion_at IS NOT NULL)
 OR (membership IN ('manual','paused') AND position IS NOT NULL AND expected_arrival_at IS NULL AND expected_completion_at IS NULL)
 OR (membership IN ('unassigned','excluded') AND position IS NULL AND expected_arrival_at IS NULL AND expected_completion_at IS NULL));
