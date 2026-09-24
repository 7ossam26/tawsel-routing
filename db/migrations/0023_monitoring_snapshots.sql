-- One durable revision authority per authorized replacement view. No business
-- event sequence or mixed-source counter is exposed to an observer.
CREATE TABLE tawsel.monitoring_views (
 tenant_id uuid NOT NULL REFERENCES tawsel.tenants,
 scope_key text NOT NULL CHECK(length(scope_key)=64),
 content_hash text NOT NULL CHECK(length(content_hash)=64),
 revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),
 PRIMARY KEY(tenant_id,scope_key)
);

-- Transaction-local write timing, visible only after commit. This is deliberately
-- NOT named WAL commit time. P38 can correlate it with commit/HTTP/render spans.
CREATE TABLE tawsel.monitoring_change_marks (
 tenant_id uuid NOT NULL REFERENCES tawsel.tenants,
 relation_name text NOT NULL, resource_id uuid NOT NULL,
 task_id uuid, driver_id uuid,
 recorded_at timestamptz NOT NULL, correlation_id text NOT NULL,
 PRIMARY KEY(tenant_id,relation_name,resource_id)
);
CREATE INDEX monitoring_task_changes ON tawsel.monitoring_change_marks(tenant_id,task_id,recorded_at DESC);
CREATE INDEX monitoring_driver_changes ON tawsel.monitoring_change_marks(tenant_id,driver_id,recorded_at DESC) WHERE task_id IS NULL;
CREATE FUNCTION tawsel.mark_monitoring_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE j jsonb; task uuid; driver uuid; resource uuid;
BEGIN
 j=to_jsonb(NEW); task=(j->>'task_id')::uuid; driver=(j->>'driver_id')::uuid;
 IF task IS NULL AND j->>'dispatch_cycle_id' IS NOT NULL THEN
  SELECT task_id,driver_id INTO task,driver FROM tawsel.b2b_dispatch_cycles
   WHERE tenant_id=(j->>'tenant_id')::uuid AND dispatch_cycle_id=(j->>'dispatch_cycle_id')::uuid;
 END IF;
 IF task IS NULL AND j->>'attempt_id' IS NOT NULL THEN
  SELECT task_id INTO task FROM tawsel.planning_attempts
   WHERE tenant_id=(j->>'tenant_id')::uuid AND attempt_id=(j->>'attempt_id')::uuid;
 END IF;
 resource=COALESCE(task,driver);
 IF resource IS NOT NULL THEN
  INSERT INTO tawsel.monitoring_change_marks VALUES ((j->>'tenant_id')::uuid,TG_TABLE_NAME,resource,task,driver,clock_timestamp(),md5(pg_current_xact_id()::text))
  ON CONFLICT(tenant_id,relation_name,resource_id) DO UPDATE SET task_id=excluded.task_id,driver_id=excluded.driver_id,recorded_at=excluded.recorded_at,correlation_id=excluded.correlation_id;
 END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE name text; BEGIN
 FOREACH name IN ARRAY ARRAY['b2c_tasks','task_source_addresses','b2b_tasks','b2b_source_snapshots','b2b_dispatch_cycles','task_locations','task_execution_options','planning_attempts','round_admissions','execution_attempts','delivery_outcomes','outcome_corrections','return_items','return_balances','branch_activities','planning_states','plan_revisions','rounds','workdays'] LOOP
  EXECUTE format('CREATE TRIGGER monitoring_change AFTER INSERT OR UPDATE ON tawsel.%I FOR EACH ROW EXECUTE FUNCTION tawsel.mark_monitoring_change()',name);
 END LOOP;
END $$;
CREATE INDEX monitoring_outcome_history ON tawsel.delivery_outcomes(tenant_id,task_id,attempt_id,revision DESC);
CREATE INDEX monitoring_admissions_task ON tawsel.round_admissions(tenant_id,task_id,admitted_at,attempt_id);
CREATE INDEX monitoring_rounds_driver ON tawsel.rounds(tenant_id,driver_id,started_at DESC);
CREATE INDEX monitoring_rounds_day ON tawsel.rounds(tenant_id,workday_id,started_at);
CREATE INDEX monitoring_cycles_driver ON tawsel.b2b_dispatch_cycles(tenant_id,driver_id,task_id);
CREATE INDEX monitoring_tasks_source_branch ON tawsel.b2b_tasks(tenant_id,integration_id,branch_id,task_id);
CREATE INDEX monitoring_evidence_task ON tawsel.command_evidence(tenant_id,(envelope->'payload'->>'taskId'));

-- Historical cycles keep their own source revision and holder. Filtering this
-- relation precedes any totals, contacts, history joins or page slicing.
CREATE VIEW tawsel.monitoring_tasks AS
 SELECT t.tenant_id,t.task_id,t.branch_id,t.driver_id,t.integration_id,t.revision AS source_revision,
 NULL::uuid AS dispatch_cycle_id,0::bigint AS assignment_revision,'personal'::text AS state,true AS latest,
 t.recipient_name,t.recipient_phone_normalized AS recipient_phone,l.original,NULL::timestamptz AS earliest_at,t.departure_at
 FROM tawsel.b2c_tasks t JOIN tawsel.location_tasks l USING(tenant_id,task_id)
 UNION ALL
 SELECT t.tenant_id,t.task_id,t.branch_id,c.driver_id,t.integration_id,c.source_revision,c.dispatch_cycle_id,c.assignment_revision,c.state,c.latest,
 s.payload->>'recipientName',s.payload->>'recipientPhone',s.payload->'destination',(s.payload->>'earliestAt')::timestamptz,c.departure_at
 FROM tawsel.b2b_tasks t JOIN tawsel.b2b_dispatch_cycles c USING(tenant_id,task_id)
 JOIN tawsel.b2b_source_snapshots s ON s.tenant_id=c.tenant_id AND s.task_id=c.task_id AND s.source_revision=c.source_revision;
