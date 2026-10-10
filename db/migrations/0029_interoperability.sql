-- Additive branch ownership: the immutable cycle, never the shipment master,
-- scopes both current execution and historical reads. Existing data has never
-- supported branch relocation; verify the frozen source against its provision.
-- Earlier pending migrations can populate cycles with deferred FK checks in
-- this same transaction. Validate them before acquiring the DDL relation lock;
-- keep checks immediate through the bounded backfill as well.
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE tawsel.b2b_dispatch_cycles ADD COLUMN branch_id uuid;
-- Only the bounded additive backfill can touch a closed cycle, inside the
-- migration transaction and its exclusive relation lock. No history bytes move.
ALTER TABLE tawsel.b2b_dispatch_cycles DISABLE TRIGGER preserve_closed_dispatch;
UPDATE tawsel.b2b_dispatch_cycles c SET branch_id=p.resource_id
FROM tawsel.b2b_tasks t, tawsel.b2b_source_snapshots s, tawsel.provisioning_records p
WHERE c.tenant_id=t.tenant_id AND c.task_id=t.task_id
 AND s.tenant_id=c.tenant_id AND s.task_id=c.task_id AND s.source_revision=c.source_revision
 AND p.tenant_id=c.tenant_id AND p.integration_id=c.integration_id AND p.entity='branch'
 AND p.external_id=s.payload->>'sourceBranchExternalId';
ALTER TABLE tawsel.b2b_dispatch_cycles ENABLE TRIGGER preserve_closed_dispatch;
-- Fail migration rather than guess historical ownership from today's master.
ALTER TABLE tawsel.b2b_dispatch_cycles ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE tawsel.b2b_dispatch_cycles ADD FOREIGN KEY(tenant_id,branch_id) REFERENCES tawsel.branches;
CREATE INDEX dispatch_branch_scope ON tawsel.b2b_dispatch_cycles(tenant_id,integration_id,branch_id,dispatch_cycle_id);
CREATE FUNCTION tawsel.cycle_branch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' AND NEW.branch_id IS NULL THEN
  SELECT branch_id INTO NEW.branch_id FROM tawsel.b2b_tasks WHERE tenant_id=NEW.tenant_id AND task_id=NEW.task_id;
 ELSIF TG_OP='UPDATE' AND NEW.branch_id IS DISTINCT FROM OLD.branch_id THEN
  RAISE EXCEPTION 'cycle branch is immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER cycle_branch BEFORE INSERT OR UPDATE ON tawsel.b2b_dispatch_cycles FOR EACH ROW EXECUTE FUNCTION tawsel.cycle_branch();
CREATE TABLE tawsel.dispatch_transfer_assertions (
 tenant_id uuid NOT NULL, integration_id uuid NOT NULL, task_id uuid NOT NULL,
 dispatch_cycle_id uuid NOT NULL, previous_dispatch_cycle_id uuid NOT NULL,
 source_branch_id uuid NOT NULL, destination_branch_id uuid NOT NULL,
 transfer_id uuid NOT NULL, destination_receipt_id uuid NOT NULL,
 assertion jsonb NOT NULL, source_id uuid NOT NULL, action_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,dispatch_cycle_id),
 UNIQUE(tenant_id,integration_id,task_id,destination_receipt_id),
 FOREIGN KEY(tenant_id,dispatch_cycle_id) REFERENCES tawsel.b2b_dispatch_cycles,
 FOREIGN KEY(tenant_id,previous_dispatch_cycle_id) REFERENCES tawsel.b2b_dispatch_cycles,
 FOREIGN KEY(tenant_id,source_id,action_id) REFERENCES tawsel.command_identities,
 CHECK(source_branch_id<>destination_branch_id)
);
CREATE TRIGGER immutable_transfer_assertion BEFORE UPDATE OR DELETE ON tawsel.dispatch_transfer_assertions FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();

CREATE OR REPLACE VIEW tawsel.location_tasks AS
 SELECT t.tenant_id,t.task_id,t.branch_id,t.driver_id,t.integration_id,t.revision AS source_revision,
 t.departure_at,t.recipient_name,'personal'::text AS kind,
 jsonb_strip_nulls(jsonb_build_object('kind',s.kind,'addressText',s.address_text,'coordinates',
 CASE WHEN s.latitude IS NOT NULL THEN jsonb_build_object('latitude',s.latitude,'longitude',s.longitude) END)) AS original,
 NULL::uuid AS dispatch_cycle_id,NULL::text AS state,NULL::timestamptz AS earliest_at
 FROM tawsel.b2c_tasks t JOIN tawsel.task_source_addresses s USING(tenant_id,task_id)
 UNION ALL
 SELECT t.tenant_id,t.task_id,c.branch_id,c.driver_id,t.integration_id,c.source_revision,c.departure_at,
 s.payload->>'recipientName','company',s.payload->'destination',c.dispatch_cycle_id,c.state,(s.payload->>'earliestAt')::timestamptz
 FROM tawsel.b2b_tasks t JOIN tawsel.b2b_dispatch_cycles c USING(tenant_id,task_id)
 JOIN tawsel.b2b_source_snapshots s ON s.tenant_id=c.tenant_id AND s.task_id=c.task_id AND s.source_revision=c.source_revision WHERE c.latest;

CREATE OR REPLACE VIEW tawsel.monitoring_tasks AS
 SELECT t.tenant_id,t.task_id,t.branch_id,t.driver_id,t.integration_id,t.revision AS source_revision,
 NULL::uuid AS dispatch_cycle_id,0::bigint AS assignment_revision,'personal'::text AS state,true AS latest,
 t.recipient_name,t.recipient_phone_normalized AS recipient_phone,l.original,NULL::timestamptz AS earliest_at,t.departure_at
 FROM tawsel.b2c_tasks t JOIN tawsel.location_tasks l USING(tenant_id,task_id)
 UNION ALL
 SELECT t.tenant_id,t.task_id,c.branch_id,c.driver_id,t.integration_id,c.source_revision,c.dispatch_cycle_id,c.assignment_revision,c.state,c.latest,
 s.payload->>'recipientName',s.payload->>'recipientPhone',s.payload->'destination',(s.payload->>'earliestAt')::timestamptz,c.departure_at
 FROM tawsel.b2b_tasks t JOIN tawsel.b2b_dispatch_cycles c USING(tenant_id,task_id)
 JOIN tawsel.b2b_source_snapshots s ON s.tenant_id=c.tenant_id AND s.task_id=c.task_id AND s.source_revision=c.source_revision;
