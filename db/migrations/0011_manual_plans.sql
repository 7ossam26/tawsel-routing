ALTER TABLE tawsel.plan_revisions DROP CONSTRAINT plan_revisions_state_check;
ALTER TABLE tawsel.plan_revisions ADD CHECK (state IN ('draft','ready','partial','manual'));
ALTER TABLE tawsel.plan_revisions ALTER COLUMN job_id DROP NOT NULL;
ALTER TABLE tawsel.plan_revisions ALTER COLUMN candidate DROP NOT NULL;
ALTER TABLE tawsel.plan_revisions ADD COLUMN input jsonb;
ALTER TABLE tawsel.plan_revisions ADD COLUMN source_id uuid;
ALTER TABLE tawsel.plan_revisions ADD COLUMN action_id uuid;
ALTER TABLE tawsel.plan_revisions ADD FOREIGN KEY (tenant_id,source_id,action_id) REFERENCES tawsel.command_identities;
ALTER TABLE tawsel.plan_revisions ADD CHECK (
 (state='manual' AND job_id IS NULL AND candidate IS NULL AND input IS NOT NULL AND source_id IS NOT NULL AND action_id IS NOT NULL)
 OR (state<>'manual' AND job_id IS NOT NULL AND candidate IS NOT NULL AND input IS NULL AND source_id IS NULL AND action_id IS NULL));
CREATE UNIQUE INDEX manual_plan_command ON tawsel.plan_revisions (tenant_id,source_id,action_id) WHERE state='manual';
ALTER TABLE tawsel.forecast_members DROP CONSTRAINT forecast_members_membership_check;
ALTER TABLE tawsel.forecast_members DROP CONSTRAINT forecast_members_check;
ALTER TABLE tawsel.forecast_members ADD CHECK (membership IN ('assigned','manual','unassigned','excluded'));
ALTER TABLE tawsel.forecast_members ADD CHECK (
 (membership='assigned' AND position IS NOT NULL AND expected_arrival_at IS NOT NULL AND expected_completion_at IS NOT NULL)
 OR (membership='manual' AND position IS NOT NULL AND expected_arrival_at IS NULL AND expected_completion_at IS NULL)
 OR (membership IN ('unassigned','excluded') AND position IS NULL AND expected_arrival_at IS NULL AND expected_completion_at IS NULL));
