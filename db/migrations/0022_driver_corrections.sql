-- Append full immutable revisions. The original attempt resolution remains an
-- anchor to its original outcome; effective reads choose the unsuperseded report.
ALTER TABLE tawsel.outbox_intents DROP CONSTRAINT outbox_intents_check1;
ALTER TABLE tawsel.outbox_intents ADD CONSTRAINT account_notification_scope CHECK(recipient_kind<>'account' OR
 (recipient_id=source_id AND event_type IN ('device.executionTransferred','evidence.received','evidence.adoptionResolved')));
ALTER TABLE tawsel.delivery_outcomes DROP CONSTRAINT delivery_outcomes_tenant_id_attempt_id_key;
CREATE TABLE tawsel.outcome_corrections (
 tenant_id uuid NOT NULL, correction_id uuid NOT NULL, attempt_id uuid NOT NULL,
 outcome_id uuid NOT NULL, previous_outcome_id uuid, previous_revision bigint NOT NULL CHECK(previous_revision>=0),
 source_id uuid NOT NULL, action_id uuid NOT NULL,
 evidence_source_id uuid, evidence_action_id uuid, evidence_receipt_id uuid,
 record jsonb NOT NULL,
 PRIMARY KEY(tenant_id,correction_id), UNIQUE(tenant_id,outcome_id),
 UNIQUE(tenant_id,previous_outcome_id), UNIQUE(tenant_id,source_id,action_id),
 UNIQUE(tenant_id,evidence_source_id,evidence_action_id),
 FOREIGN KEY(tenant_id,outcome_id,attempt_id) REFERENCES tawsel.delivery_outcomes(tenant_id,outcome_id,attempt_id),
 FOREIGN KEY(tenant_id,previous_outcome_id,attempt_id) REFERENCES tawsel.delivery_outcomes(tenant_id,outcome_id,attempt_id),
 FOREIGN KEY(tenant_id,source_id,action_id) REFERENCES tawsel.command_identities,
 FOREIGN KEY(tenant_id,evidence_source_id,evidence_action_id) REFERENCES tawsel.command_evidence,
 CHECK((previous_outcome_id IS NULL)=(previous_revision=0)),
 CHECK(previous_outcome_id IS DISTINCT FROM outcome_id),
 CHECK((evidence_source_id IS NULL AND evidence_action_id IS NULL AND evidence_receipt_id IS NULL)
  OR(evidence_source_id IS NOT NULL AND evidence_action_id IS NOT NULL AND evidence_receipt_id IS NOT NULL))
);
CREATE TRIGGER immutable_corrections BEFORE UPDATE OR DELETE ON tawsel.outcome_corrections
 FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE FUNCTION tawsel.validate_outcome_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prior tawsel.delivery_outcomes; link tawsel.outcome_corrections;
BEGIN
 SELECT * INTO prior FROM tawsel.delivery_outcomes WHERE tenant_id=NEW.tenant_id AND attempt_id=NEW.attempt_id AND revision<NEW.revision ORDER BY revision DESC LIMIT 1;
 IF FOUND THEN
  SELECT * INTO link FROM tawsel.outcome_corrections WHERE tenant_id=NEW.tenant_id AND outcome_id=NEW.outcome_id;
  IF NOT FOUND OR link.previous_outcome_id<>prior.outcome_id OR link.previous_revision<>prior.revision
   OR ROW(NEW.round_id,NEW.task_id,NEW.driver_id,NEW.dispatch_cycle_id,NEW.branch_id,NEW.integration_id,NEW.source_revision,NEW.kind)
   IS DISTINCT FROM ROW(prior.round_id,prior.task_id,prior.driver_id,prior.dispatch_cycle_id,prior.branch_id,prior.integration_id,prior.source_revision,prior.kind) THEN
   RAISE EXCEPTION 'outcome revisions require an exact immutable correction link' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NULL;
END; $$;
CREATE CONSTRAINT TRIGGER valid_outcome_revision AFTER INSERT ON tawsel.delivery_outcomes
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION tawsel.validate_outcome_revision();
CREATE VIEW tawsel.effective_attempt_outcomes AS
 SELECT o.* FROM tawsel.delivery_outcomes o WHERE NOT EXISTS
 (SELECT 1 FROM tawsel.delivery_outcomes n WHERE n.tenant_id=o.tenant_id AND n.attempt_id=o.attempt_id AND n.revision>o.revision);
CREATE OR REPLACE VIEW tawsel.cycle_custody AS
 SELECT o.tenant_id,o.driver_id,o.branch_id,o.integration_id,o.task_id,o.dispatch_cycle_id,o.outcome_id,o.attempt_id,
 q.source_line_id,q.source_quantity,q.delivered,q.held_return_required,
 COALESCE(b.received,0) AS received,COALESCE(b.lost,0) AS lost,COALESCE(b.damaged,0) AS damaged,
 q.held_return_required-COALESCE(b.received,0)-COALESCE(b.lost,0)-COALESCE(b.damaged,0) AS held
 FROM tawsel.effective_attempt_outcomes o JOIN tawsel.planning_attempts a USING(tenant_id,attempt_id)
 JOIN tawsel.outcome_quantities q USING(tenant_id,outcome_id)
 LEFT JOIN tawsel.return_balances b ON b.tenant_id=o.tenant_id AND b.dispatch_cycle_id=o.dispatch_cycle_id AND b.source_line_id=q.source_line_id
 WHERE a.latest;
