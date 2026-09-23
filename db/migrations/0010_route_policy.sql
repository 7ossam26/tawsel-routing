-- Old candidate drafts remain immutable and unvalidated. Never promote history.
ALTER TABLE tawsel.plan_revisions DROP CONSTRAINT plan_revisions_state_check;
ALTER TABLE tawsel.plan_revisions ADD CHECK (state IN ('draft','ready','partial'));
ALTER TABLE tawsel.plan_revisions ADD COLUMN route_policy jsonb;
ALTER TABLE tawsel.plan_revisions ADD CHECK ((state='draft')=(route_policy IS NULL));
