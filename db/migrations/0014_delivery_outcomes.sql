-- P17 extends attempts without fabricating heading or arrival for phone results.
ALTER TABLE tawsel.execution_attempts DROP CONSTRAINT execution_attempts_stage_check;
ALTER TABLE tawsel.execution_attempts DROP CONSTRAINT execution_attempts_check;
ALTER TABLE tawsel.execution_attempts ALTER COLUMN first_heading DROP NOT NULL;
ALTER TABLE tawsel.execution_attempts ALTER COLUMN heading DROP NOT NULL;
ALTER TABLE tawsel.execution_attempts ADD COLUMN resolution jsonb;
ALTER TABLE tawsel.execution_attempts ADD COLUMN resolved_outcome_id uuid;
ALTER TABLE tawsel.execution_attempts ADD CONSTRAINT execution_attempts_stage_check CHECK (stage IN ('heading','paused','arrived','resolved'));
ALTER TABLE tawsel.execution_attempts ADD CHECK (
 (stage='resolved' AND resolution IS NOT NULL AND resolved_outcome_id IS NOT NULL) OR
 (stage<>'resolved' AND resolution IS NULL AND resolved_outcome_id IS NULL AND heading IS NOT NULL AND first_heading IS NOT NULL AND ((stage='arrived')=(arrival IS NOT NULL)))
);
ALTER TABLE tawsel.execution_attempts ADD CHECK(arrival IS NULL OR heading IS NOT NULL);
CREATE OR REPLACE FUNCTION tawsel.retain_attempt_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR ROW(NEW.tenant_id,NEW.round_id,NEW.attempt_id,NEW.task_id,NEW.first_heading) IS DISTINCT FROM ROW(OLD.tenant_id,OLD.round_id,OLD.attempt_id,OLD.task_id,OLD.first_heading)
  OR (OLD.arrival IS NOT NULL AND NEW.arrival IS DISTINCT FROM OLD.arrival)
  OR (OLD.stage='resolved' AND NEW IS DISTINCT FROM OLD) THEN
  RAISE EXCEPTION 'attempt identity and recorded evidence are immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
ALTER TABLE tawsel.current_activity_history ALTER COLUMN current_activity DROP NOT NULL;

CREATE TABLE tawsel.delivery_outcomes (
 tenant_id uuid NOT NULL, outcome_id uuid NOT NULL, round_id uuid NOT NULL, attempt_id uuid NOT NULL, task_id uuid NOT NULL,
 driver_id uuid NOT NULL, dispatch_cycle_id uuid, branch_id uuid, integration_id uuid,
 source_revision bigint NOT NULL CHECK (source_revision>0), revision bigint NOT NULL CHECK (revision>0),
 kind text NOT NULL CHECK(kind IN ('personal','company')),
 outcome text NOT NULL CHECK(outcome IN ('full','partial','refused','no-answer')),
 record jsonb NOT NULL, source_id uuid NOT NULL, action_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,outcome_id), UNIQUE(tenant_id,attempt_id), UNIQUE(tenant_id,task_id,revision), UNIQUE(tenant_id,source_id,action_id),
 UNIQUE(tenant_id,task_id,outcome_id), UNIQUE(tenant_id,outcome_id,task_id,source_revision), UNIQUE(tenant_id,outcome_id,attempt_id),
 FOREIGN KEY(tenant_id,round_id,attempt_id) REFERENCES tawsel.execution_attempts,
 FOREIGN KEY(tenant_id,attempt_id,task_id) REFERENCES tawsel.planning_attempts(tenant_id,attempt_id,task_id),
 FOREIGN KEY(tenant_id,driver_id,round_id) REFERENCES tawsel.rounds(tenant_id,driver_id,round_id),
 FOREIGN KEY(tenant_id,source_id,action_id) REFERENCES tawsel.command_identities,
 FOREIGN KEY(tenant_id,branch_id) REFERENCES tawsel.branches,
 FOREIGN KEY(tenant_id,integration_id,dispatch_cycle_id) REFERENCES tawsel.b2b_dispatch_cycles(tenant_id,integration_id,dispatch_cycle_id),
 CHECK((kind='personal' AND dispatch_cycle_id IS NULL AND branch_id IS NULL AND integration_id IS NULL AND outcome<>'partial')
  OR(kind='company' AND dispatch_cycle_id IS NOT NULL AND branch_id IS NOT NULL AND integration_id IS NOT NULL))
);
ALTER TABLE tawsel.execution_attempts ADD FOREIGN KEY(tenant_id,resolved_outcome_id,attempt_id)
 REFERENCES tawsel.delivery_outcomes(tenant_id,outcome_id,attempt_id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE tawsel.outcome_quantities (
 tenant_id uuid NOT NULL, outcome_id uuid NOT NULL, task_id uuid NOT NULL, source_revision bigint NOT NULL, source_line_id text NOT NULL,
 source_quantity integer NOT NULL CHECK(source_quantity BETWEEN 1 AND 1000000),
 delivered integer NOT NULL CHECK(delivered>=0), held_return_required integer NOT NULL CHECK(held_return_required>=0),
 PRIMARY KEY(tenant_id,outcome_id,source_line_id), CHECK(delivered+held_return_required=source_quantity),
 FOREIGN KEY(tenant_id,outcome_id,task_id,source_revision) REFERENCES tawsel.delivery_outcomes(tenant_id,outcome_id,task_id,source_revision),
 FOREIGN KEY(tenant_id,task_id,source_revision,source_line_id) REFERENCES tawsel.b2b_source_lines
);
CREATE TABLE tawsel.outcome_collections (
 tenant_id uuid NOT NULL, outcome_id uuid NOT NULL,
 currency text NOT NULL CHECK(currency='EGP'), exponent smallint NOT NULL CHECK(exponent=2),
 reported_minor bigint CHECK(reported_minor BETWEEN 0 AND 9007199254740991),
 goods_minor bigint NOT NULL CHECK(goods_minor BETWEEN 0 AND 9007199254740991),
 shipping_minor bigint NOT NULL CHECK(shipping_minor BETWEEN 0 AND 9007199254740991),
 unpaid_shipping_minor bigint NOT NULL CHECK(unpaid_shipping_minor BETWEEN 0 AND 9007199254740991),
 shipping_status text NOT NULL CHECK(shipping_status IN ('collected','explicitly-unpaid','not-attempted','not-due','not-applicable')),
 PRIMARY KEY(tenant_id,outcome_id), FOREIGN KEY(tenant_id,outcome_id) REFERENCES tawsel.delivery_outcomes,
 CHECK((reported_minor IS NULL AND goods_minor=0 AND shipping_minor=0 AND unpaid_shipping_minor=0)
  OR (reported_minor IS NOT NULL AND reported_minor::numeric=goods_minor::numeric+shipping_minor::numeric)),
 CHECK((shipping_status='explicitly-unpaid' AND unpaid_shipping_minor>0 AND reported_minor=0)
  OR (shipping_status<>'explicitly-unpaid' AND unpaid_shipping_minor=0)),
 CHECK((shipping_status='collected' AND shipping_minor>0) OR (shipping_status<>'collected' AND shipping_minor=0))
);
-- Projection points at preserved history. P18/P23 must replace this explicitly
-- under the same invariant locks, never erase an earlier accepted result.
CREATE TABLE tawsel.effective_task_outcomes (
 tenant_id uuid NOT NULL, task_id uuid NOT NULL, outcome_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,task_id),
 FOREIGN KEY(tenant_id,task_id,outcome_id) REFERENCES tawsel.delivery_outcomes(tenant_id,task_id,outcome_id)
);
CREATE INDEX outcomes_driver_round ON tawsel.delivery_outcomes(tenant_id,driver_id,round_id);
CREATE INDEX outcomes_cycle ON tawsel.delivery_outcomes(tenant_id,dispatch_cycle_id);
CREATE TRIGGER immutable_outcomes BEFORE UPDATE OR DELETE ON tawsel.delivery_outcomes FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE TRIGGER immutable_outcome_quantities BEFORE UPDATE OR DELETE ON tawsel.outcome_quantities FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE TRIGGER immutable_outcome_collections BEFORE UPDATE OR DELETE ON tawsel.outcome_collections FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
