-- Stable shipment/task identity, new immutable cycle source and stock lineage.
ALTER TABLE tawsel.b2b_dispatch_cycles DROP CONSTRAINT b2b_dispatch_cycles_tenant_id_task_id_key;
ALTER TABLE tawsel.b2b_dispatch_cycles ADD COLUMN latest boolean NOT NULL DEFAULT true;
ALTER TABLE tawsel.b2b_dispatch_cycles ADD COLUMN source_revision bigint;
ALTER TABLE tawsel.b2b_dispatch_cycles ADD COLUMN previous_dispatch_cycle_id uuid;
UPDATE tawsel.b2b_dispatch_cycles c SET source_revision=t.source_revision FROM tawsel.b2b_tasks t WHERE t.tenant_id=c.tenant_id AND t.task_id=c.task_id;
ALTER TABLE tawsel.b2b_dispatch_cycles ALTER COLUMN source_revision SET NOT NULL;
ALTER TABLE tawsel.b2b_dispatch_cycles ADD UNIQUE(tenant_id,dispatch_cycle_id,task_id);
ALTER TABLE tawsel.b2b_dispatch_cycles ADD FOREIGN KEY(tenant_id,task_id,source_revision) REFERENCES tawsel.b2b_source_snapshots DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE tawsel.b2b_dispatch_cycles ADD FOREIGN KEY(tenant_id,previous_dispatch_cycle_id,task_id) REFERENCES tawsel.b2b_dispatch_cycles(tenant_id,dispatch_cycle_id,task_id);
CREATE UNIQUE INDEX one_current_dispatch ON tawsel.b2b_dispatch_cycles(tenant_id,task_id) WHERE latest;
-- Legacy intake inserts remain compatible during rollout; freeze each cycle's
-- current source revision on creation and advance only the current cycle.
CREATE FUNCTION tawsel.initial_dispatch_source() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.source_revision IS NULL THEN SELECT source_revision INTO NEW.source_revision FROM tawsel.b2b_tasks WHERE tenant_id=NEW.tenant_id AND task_id=NEW.task_id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER initial_dispatch_source BEFORE INSERT ON tawsel.b2b_dispatch_cycles FOR EACH ROW EXECUTE FUNCTION tawsel.initial_dispatch_source();
CREATE FUNCTION tawsel.advance_dispatch_source() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE tawsel.b2b_dispatch_cycles SET source_revision=NEW.source_revision WHERE tenant_id=NEW.tenant_id AND task_id=NEW.task_id AND latest;
 RETURN NEW;
END $$;
CREATE TRIGGER advance_dispatch_source AFTER UPDATE OF source_revision ON tawsel.b2b_tasks FOR EACH ROW EXECUTE FUNCTION tawsel.advance_dispatch_source();
ALTER TABLE tawsel.b2b_dispatch_cycles ADD UNIQUE(tenant_id,dispatch_cycle_id,previous_dispatch_cycle_id);
CREATE TABLE tawsel.redispatch_allocations (
 tenant_id uuid NOT NULL, dispatch_cycle_id uuid NOT NULL, previous_dispatch_cycle_id uuid NOT NULL,
 source_line_id text NOT NULL, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
 source_id uuid NOT NULL, action_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,dispatch_cycle_id,source_line_id),
 FOREIGN KEY(tenant_id,dispatch_cycle_id) REFERENCES tawsel.b2b_dispatch_cycles,
 FOREIGN KEY(tenant_id,dispatch_cycle_id,previous_dispatch_cycle_id) REFERENCES tawsel.b2b_dispatch_cycles(tenant_id,dispatch_cycle_id,previous_dispatch_cycle_id),
 FOREIGN KEY(tenant_id,previous_dispatch_cycle_id,source_line_id) REFERENCES tawsel.return_balances,
 FOREIGN KEY(tenant_id,source_id,action_id) REFERENCES tawsel.command_identities
);
CREATE TRIGGER preserve_redispatch_allocation BEFORE UPDATE OR DELETE ON tawsel.redispatch_allocations
 FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE FUNCTION tawsel.check_redispatch_stock() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE available integer; allocated bigint;
BEGIN
 SELECT received INTO available FROM tawsel.return_balances WHERE tenant_id=NEW.tenant_id AND dispatch_cycle_id=NEW.previous_dispatch_cycle_id AND source_line_id=NEW.source_line_id FOR UPDATE;
 SELECT COALESCE(sum(quantity),0) INTO allocated FROM tawsel.redispatch_allocations WHERE tenant_id=NEW.tenant_id AND previous_dispatch_cycle_id=NEW.previous_dispatch_cycle_id AND source_line_id=NEW.source_line_id;
 IF allocated+NEW.quantity>available THEN RAISE EXCEPTION 'redispatch exceeds confirmed received stock' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_redispatch_stock BEFORE INSERT ON tawsel.redispatch_allocations FOR EACH ROW EXECUTE FUNCTION tawsel.check_redispatch_stock();
CREATE FUNCTION tawsel.retain_closed_dispatch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT OLD.latest AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'old dispatch cannot reopen or change holder/source' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER preserve_closed_dispatch BEFORE UPDATE ON tawsel.b2b_dispatch_cycles FOR EACH ROW EXECUTE FUNCTION tawsel.retain_closed_dispatch();
-- Prior holder/outcome/custody remain historical. Only the latest dispatch is
-- customer execution input; receipt offers and carry-forward query old custody.
CREATE OR REPLACE VIEW tawsel.location_tasks AS
 SELECT t.tenant_id,t.task_id,t.branch_id,t.driver_id,t.integration_id,t.revision AS source_revision,
 t.departure_at,t.recipient_name,'personal'::text AS kind,
 jsonb_strip_nulls(jsonb_build_object('kind',s.kind,'addressText',s.address_text,'coordinates',
 CASE WHEN s.latitude IS NOT NULL THEN jsonb_build_object('latitude',s.latitude,'longitude',s.longitude) END)) AS original,
 NULL::uuid AS dispatch_cycle_id,NULL::text AS state,NULL::timestamptz AS earliest_at
 FROM tawsel.b2c_tasks t JOIN tawsel.task_source_addresses s USING(tenant_id,task_id)
 UNION ALL
 SELECT t.tenant_id,t.task_id,t.branch_id,c.driver_id,t.integration_id,c.source_revision,c.departure_at,
 s.payload->>'recipientName','company',s.payload->'destination',c.dispatch_cycle_id,c.state,(s.payload->>'earliestAt')::timestamptz
 FROM tawsel.b2b_tasks t JOIN tawsel.b2b_dispatch_cycles c USING(tenant_id,task_id)
 JOIN tawsel.b2b_source_snapshots s ON s.tenant_id=c.tenant_id AND s.task_id=c.task_id AND s.source_revision=c.source_revision WHERE c.latest;
