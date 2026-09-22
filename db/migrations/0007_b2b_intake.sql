-- P10 source snapshots and receipt. No route optimizer, workday or departure implementation.
CREATE TABLE tawsel.b2b_tasks (
  tenant_id uuid NOT NULL,
  integration_id uuid NOT NULL,
  task_id uuid NOT NULL,
  external_id text NOT NULL CHECK (length(external_id) BETWEEN 1 AND 256),
  branch_id uuid NOT NULL,
  source_revision bigint NOT NULL CHECK (source_revision BETWEEN 1 AND 9007199254740991),
  PRIMARY KEY (tenant_id,task_id),
  UNIQUE (tenant_id,integration_id,external_id),
  UNIQUE (tenant_id,integration_id,task_id),
  FOREIGN KEY (tenant_id,integration_id) REFERENCES tawsel.provisioning_sources,
  FOREIGN KEY (tenant_id,branch_id) REFERENCES tawsel.branches
);
CREATE TABLE tawsel.b2b_source_snapshots (
  tenant_id uuid NOT NULL,
  task_id uuid NOT NULL,
  source_revision bigint NOT NULL CHECK (source_revision BETWEEN 1 AND 9007199254740991),
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  source_id uuid NOT NULL,
  action_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id,task_id,source_revision),
  FOREIGN KEY (tenant_id,source_id,task_id) REFERENCES tawsel.b2b_tasks (tenant_id,integration_id,task_id),
  FOREIGN KEY (tenant_id,source_id,action_id) REFERENCES tawsel.command_identities
);
ALTER TABLE tawsel.b2b_tasks ADD FOREIGN KEY (tenant_id,task_id,source_revision)
  REFERENCES tawsel.b2b_source_snapshots DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE tawsel.b2b_source_lines (
  tenant_id uuid NOT NULL, task_id uuid NOT NULL, source_revision bigint NOT NULL,
  source_line_id text NOT NULL CHECK (length(source_line_id) BETWEEN 1 AND 256),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
  unit_due_minor bigint NOT NULL CHECK (unit_due_minor BETWEEN 0 AND 9007199254740991),
  currency text NOT NULL CHECK (currency='EGP'), exponent smallint NOT NULL CHECK (exponent=2),
  PRIMARY KEY (tenant_id,task_id,source_revision,source_line_id),
  FOREIGN KEY (tenant_id,task_id,source_revision) REFERENCES tawsel.b2b_source_snapshots
);
CREATE TABLE tawsel.b2b_dispatch_cycles (
  tenant_id uuid NOT NULL, integration_id uuid NOT NULL, task_id uuid NOT NULL,
  dispatch_cycle_id uuid NOT NULL, source_dispatch_cycle_id text NOT NULL CHECK (length(source_dispatch_cycle_id) BETWEEN 1 AND 256),
  assignment_revision bigint NOT NULL DEFAULT 0 CHECK (assignment_revision BETWEEN 0 AND 9007199254740991),
  assignment_hash text,
  state text NOT NULL DEFAULT 'unassigned' CHECK (state IN ('unassigned','prepared','held','withdrawn')),
  driver_id uuid, driver_external_id text, received_at timestamptz, departure_at timestamptz,
  PRIMARY KEY (tenant_id,dispatch_cycle_id),
  UNIQUE (tenant_id,integration_id,dispatch_cycle_id),
  UNIQUE (tenant_id,task_id), -- P22 will explicitly extend cycle creation after actual return.
  UNIQUE (tenant_id,integration_id,task_id,source_dispatch_cycle_id),
  FOREIGN KEY (tenant_id,integration_id,task_id) REFERENCES tawsel.b2b_tasks (tenant_id,integration_id,task_id),
  FOREIGN KEY (tenant_id,driver_id) REFERENCES tawsel.drivers,
  CHECK ((state IN ('prepared','held') AND driver_id IS NOT NULL AND driver_external_id IS NOT NULL)
    OR (state IN ('unassigned','withdrawn') AND driver_id IS NULL AND driver_external_id IS NULL)),
  CHECK ((state='held' AND received_at IS NOT NULL) OR (state<>'held' AND received_at IS NULL))
);
CREATE TABLE tawsel.b2b_assignment_history (
  tenant_id uuid NOT NULL, dispatch_cycle_id uuid NOT NULL, assignment_revision bigint NOT NULL CHECK (assignment_revision > 0),
  state jsonb NOT NULL, source_id uuid NOT NULL, action_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id,dispatch_cycle_id,assignment_revision),
  FOREIGN KEY (tenant_id,source_id,dispatch_cycle_id) REFERENCES tawsel.b2b_dispatch_cycles (tenant_id,integration_id,dispatch_cycle_id),
  FOREIGN KEY (tenant_id,source_id,action_id) REFERENCES tawsel.command_identities
);
-- Reserved remaining input slots, not a published/optimized route. All writers
-- must hold the P05 driver invariant lock; P13/P15/P18/P22 reuse this ledger.
CREATE TABLE tawsel.driver_planned_stops (
  tenant_id uuid NOT NULL, driver_id uuid NOT NULL, stop_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('customer','branch')),
  dispatch_cycle_id uuid, branch_id uuid,
  state text NOT NULL CHECK (state IN ('remaining','completed','released','paused')),
  PRIMARY KEY (tenant_id,stop_id),
  UNIQUE (tenant_id,dispatch_cycle_id),
  FOREIGN KEY (tenant_id,driver_id) REFERENCES tawsel.drivers,
  FOREIGN KEY (tenant_id,dispatch_cycle_id) REFERENCES tawsel.b2b_dispatch_cycles,
  FOREIGN KEY (tenant_id,branch_id) REFERENCES tawsel.branches,
  CHECK ((kind='customer' AND dispatch_cycle_id IS NOT NULL AND branch_id IS NULL)
    OR (kind='branch' AND dispatch_cycle_id IS NULL AND branch_id IS NOT NULL))
);
CREATE INDEX driver_remaining_stops ON tawsel.driver_planned_stops (tenant_id,driver_id) WHERE state='remaining';
CREATE TABLE tawsel.intake_replan_intents (
  tenant_id uuid NOT NULL, driver_id uuid NOT NULL, source_id uuid NOT NULL, action_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status='pending'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id,driver_id,source_id,action_id),
  FOREIGN KEY (tenant_id,driver_id) REFERENCES tawsel.drivers,
  FOREIGN KEY (tenant_id,source_id,action_id) REFERENCES tawsel.command_identities
);
CREATE FUNCTION tawsel.retain_intake_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'intake history is append-only' USING ERRCODE='23514'; END;
$$;
CREATE TRIGGER immutable_source_snapshot BEFORE UPDATE OR DELETE ON tawsel.b2b_source_snapshots
  FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE TRIGGER immutable_source_line BEFORE UPDATE OR DELETE ON tawsel.b2b_source_lines
  FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
CREATE TRIGGER immutable_assignment_history BEFORE UPDATE OR DELETE ON tawsel.b2b_assignment_history
  FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
