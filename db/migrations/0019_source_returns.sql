-- P21: requests are offers, never custody transfers. Origin is bound through
-- composite foreign keys to the frozen outcome and its actual dispatch cycle.
ALTER TABLE tawsel.delivery_outcomes ADD UNIQUE
 (tenant_id,outcome_id,task_id,dispatch_cycle_id,branch_id,integration_id,driver_id);
ALTER TABLE tawsel.delivery_outcomes ADD UNIQUE(tenant_id,outcome_id,dispatch_cycle_id);
ALTER TABLE tawsel.outcome_quantities ADD UNIQUE
 (tenant_id,outcome_id,source_line_id,held_return_required);
CREATE TABLE tawsel.return_requests (
 tenant_id uuid NOT NULL, request_id uuid NOT NULL, driver_id uuid NOT NULL,
 branch_id uuid NOT NULL, integration_id uuid NOT NULL, round_id uuid NOT NULL,
 source_id uuid NOT NULL, action_id uuid NOT NULL, requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,request_id),
 UNIQUE(tenant_id,request_id,branch_id,integration_id,driver_id),
 UNIQUE(tenant_id,source_id,action_id),
 FOREIGN KEY(tenant_id,driver_id,round_id) REFERENCES tawsel.rounds(tenant_id,driver_id,round_id),
 FOREIGN KEY(tenant_id,branch_id) REFERENCES tawsel.branches,
 FOREIGN KEY(tenant_id,integration_id) REFERENCES tawsel.integrations,
 FOREIGN KEY(tenant_id,source_id,action_id) REFERENCES tawsel.command_identities
);
CREATE TABLE tawsel.return_items (
 tenant_id uuid NOT NULL, item_id uuid NOT NULL, request_id uuid NOT NULL,
 task_id uuid NOT NULL, dispatch_cycle_id uuid NOT NULL, outcome_id uuid NOT NULL,
 branch_id uuid NOT NULL, integration_id uuid NOT NULL, driver_id uuid NOT NULL,
 source_line_id text NOT NULL, requested integer NOT NULL CHECK(requested BETWEEN 1 AND 1000000),
 revision bigint NOT NULL DEFAULT 0 CHECK(revision BETWEEN 0 AND 9007199254740991),
 received integer NOT NULL DEFAULT 0 CHECK(received>=0),
 lost integer NOT NULL DEFAULT 0 CHECK(lost>=0), damaged integer NOT NULL DEFAULT 0 CHECK(damaged>=0),
 PRIMARY KEY(tenant_id,item_id), UNIQUE(tenant_id,request_id,outcome_id,source_line_id),
 UNIQUE(tenant_id,item_id,dispatch_cycle_id,outcome_id,source_line_id),
 CHECK(received+lost+damaged<=requested),
 FOREIGN KEY(tenant_id,request_id,branch_id,integration_id,driver_id)
 REFERENCES tawsel.return_requests(tenant_id,request_id,branch_id,integration_id,driver_id),
 FOREIGN KEY(tenant_id,outcome_id,task_id,dispatch_cycle_id,branch_id,integration_id,driver_id)
 REFERENCES tawsel.delivery_outcomes(tenant_id,outcome_id,task_id,dispatch_cycle_id,branch_id,integration_id,driver_id),
 FOREIGN KEY(tenant_id,outcome_id,source_line_id) REFERENCES tawsel.outcome_quantities
);
-- One actual custody total per cycle/line, tied to the resolved outcome.
-- Historical no-answer attempts are not added together as physical pieces.
CREATE TABLE tawsel.return_balances (
 tenant_id uuid NOT NULL, dispatch_cycle_id uuid NOT NULL, source_line_id text NOT NULL,
 outcome_id uuid NOT NULL, return_required integer NOT NULL CHECK(return_required BETWEEN 1 AND 1000000),
 received integer NOT NULL DEFAULT 0 CHECK(received>=0),
 lost integer NOT NULL DEFAULT 0 CHECK(lost>=0), damaged integer NOT NULL DEFAULT 0 CHECK(damaged>=0),
 PRIMARY KEY(tenant_id,dispatch_cycle_id,source_line_id),
 CHECK(received+lost+damaged<=return_required),
 FOREIGN KEY(tenant_id,dispatch_cycle_id) REFERENCES tawsel.b2b_dispatch_cycles,
 FOREIGN KEY(tenant_id,outcome_id,dispatch_cycle_id) REFERENCES tawsel.delivery_outcomes(tenant_id,outcome_id,dispatch_cycle_id),
 FOREIGN KEY(tenant_id,outcome_id,source_line_id,return_required)
 REFERENCES tawsel.outcome_quantities(tenant_id,outcome_id,source_line_id,held_return_required)
);
CREATE TABLE tawsel.return_transitions (
 tenant_id uuid NOT NULL, transition_id uuid NOT NULL, item_id uuid NOT NULL,
 dispatch_cycle_id uuid NOT NULL, outcome_id uuid NOT NULL, source_line_id text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('received','lost','damaged')),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000), revision bigint NOT NULL CHECK(revision>0),
 source_id uuid NOT NULL, action_id uuid NOT NULL, record jsonb NOT NULL,
 PRIMARY KEY(tenant_id,transition_id), UNIQUE(tenant_id,item_id,revision),
 FOREIGN KEY(tenant_id,item_id,dispatch_cycle_id,outcome_id,source_line_id)
 REFERENCES tawsel.return_items(tenant_id,item_id,dispatch_cycle_id,outcome_id,source_line_id),
 FOREIGN KEY(tenant_id,source_id,action_id) REFERENCES tawsel.command_identities,
 FOREIGN KEY(tenant_id,transition_id) REFERENCES tawsel.retry_dependencies(tenant_id,dependency_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX return_pending_driver ON tawsel.return_requests(tenant_id,integration_id,branch_id,driver_id,request_id);
CREATE INDEX return_item_outcome ON tawsel.return_items(tenant_id,outcome_id,source_line_id);
CREATE TRIGGER preserve_return_request BEFORE UPDATE OR DELETE ON tawsel.return_requests
 FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE TRIGGER preserve_return_transition BEFORE UPDATE OR DELETE ON tawsel.return_transitions
 FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE FUNCTION tawsel.retain_return_quantity_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['revision','received','lost','damaged']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['revision','received','lost','damaged'])
 OR NEW.received<OLD.received OR NEW.lost<OLD.lost OR NEW.damaged<OLD.damaged THEN
 RAISE EXCEPTION 'return identity and confirmed quantities cannot be reversed' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER preserve_return_item BEFORE UPDATE OR DELETE ON tawsel.return_items
 FOR EACH ROW EXECUTE FUNCTION tawsel.retain_return_quantity_identity();
CREATE TRIGGER preserve_return_balance BEFORE UPDATE OR DELETE ON tawsel.return_balances
 FOR EACH ROW EXECUTE FUNCTION tawsel.retain_return_quantity_identity();
CREATE VIEW tawsel.cycle_custody AS
 SELECT o.tenant_id,o.driver_id,o.branch_id,o.integration_id,o.task_id,o.dispatch_cycle_id,o.outcome_id,o.attempt_id,
 q.source_line_id,q.source_quantity,q.delivered,q.held_return_required,
 COALESCE(b.received,0) AS received,COALESCE(b.lost,0) AS lost,COALESCE(b.damaged,0) AS damaged,
 q.held_return_required-COALESCE(b.received,0)-COALESCE(b.lost,0)-COALESCE(b.damaged,0) AS held
 FROM tawsel.delivery_outcomes o JOIN tawsel.planning_attempts a USING(tenant_id,attempt_id)
 JOIN tawsel.outcome_quantities q USING(tenant_id,outcome_id)
 LEFT JOIN tawsel.return_balances b ON b.tenant_id=o.tenant_id AND b.dispatch_cycle_id=o.dispatch_cycle_id AND b.source_line_id=q.source_line_id
 WHERE a.latest;
