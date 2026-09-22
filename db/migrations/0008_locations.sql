-- Execution pins never replace the commercial/intake source.
CREATE TABLE tawsel.task_locations (
 tenant_id uuid NOT NULL, task_id uuid NOT NULL,
 b2c_task_id uuid, b2b_task_id uuid,
 revision bigint NOT NULL CHECK (revision BETWEEN 1 AND 9007199254740991),
 source_revision bigint NOT NULL CHECK (source_revision > 0),
 latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
 provenance jsonb NOT NULL, confirmed_by uuid NOT NULL, confirmed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (tenant_id,task_id),
 FOREIGN KEY (tenant_id,b2c_task_id) REFERENCES tawsel.b2c_tasks,
 FOREIGN KEY (tenant_id,b2b_task_id) REFERENCES tawsel.b2b_tasks,
 FOREIGN KEY (tenant_id,confirmed_by) REFERENCES tawsel.accounts,
 CHECK ((b2c_task_id=task_id AND b2b_task_id IS NULL) OR (b2b_task_id=task_id AND b2c_task_id IS NULL)),
 CHECK (num_nonnulls(b2c_task_id,b2b_task_id)=1)
);
CREATE TABLE tawsel.location_history (
 tenant_id uuid NOT NULL, task_id uuid NOT NULL, revision bigint NOT NULL,
 snapshot jsonb NOT NULL, source_id uuid NOT NULL, action_id uuid NOT NULL,
 PRIMARY KEY (tenant_id,task_id,revision),
 FOREIGN KEY (tenant_id,task_id) REFERENCES tawsel.task_locations,
 FOREIGN KEY (tenant_id,source_id,action_id) REFERENCES tawsel.command_identities
);
CREATE TRIGGER immutable_location_history BEFORE UPDATE OR DELETE ON tawsel.location_history
 FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE TABLE tawsel.location_planning_inputs (
 tenant_id uuid NOT NULL, driver_id uuid NOT NULL,
 revision bigint NOT NULL CHECK (revision > 0), status text NOT NULL DEFAULT 'pending' CHECK (status='pending'),
 PRIMARY KEY (tenant_id,driver_id), FOREIGN KEY (tenant_id,driver_id) REFERENCES tawsel.drivers
);
CREATE VIEW tawsel.location_tasks AS
 SELECT t.tenant_id,t.task_id,t.branch_id,t.driver_id,t.integration_id,t.revision AS source_revision,
 t.departure_at,t.recipient_name,'personal'::text AS kind,
 jsonb_strip_nulls(jsonb_build_object('kind',s.kind,'addressText',s.address_text,'coordinates',
 CASE WHEN s.latitude IS NOT NULL THEN jsonb_build_object('latitude',s.latitude,'longitude',s.longitude) END)) AS original,
 NULL::uuid AS dispatch_cycle_id,NULL::text AS state,NULL::timestamptz AS earliest_at
 FROM tawsel.b2c_tasks t JOIN tawsel.task_source_addresses s USING(tenant_id,task_id)
 UNION ALL
 SELECT t.tenant_id,t.task_id,t.branch_id,c.driver_id,t.integration_id,t.source_revision,c.departure_at,
 s.payload->>'recipientName','company',s.payload->'destination',c.dispatch_cycle_id,c.state,(s.payload->>'earliestAt')::timestamptz
 FROM tawsel.b2b_tasks t JOIN tawsel.b2b_source_snapshots s USING(tenant_id,task_id,source_revision)
 JOIN tawsel.b2b_dispatch_cycles c USING(tenant_id,task_id);
