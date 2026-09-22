-- Independent intake owns a personal-tenant task only. Original destination input
-- stays separate so P11 may add/replace an execution location without rewriting it.
CREATE TABLE tawsel.b2c_tasks (
  tenant_id uuid NOT NULL,
  task_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  branch_id uuid,
  integration_id uuid,
  tenant_kind text NOT NULL DEFAULT 'personal' CHECK (tenant_kind = 'personal'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  recipient_name text NOT NULL CHECK (length(btrim(recipient_name)) BETWEEN 1 AND 200),
  recipient_phone text NOT NULL CHECK (length(recipient_phone) BETWEEN 8 AND 32),
  recipient_phone_normalized text NOT NULL CHECK (recipient_phone_normalized ~ '^\+[1-9][0-9]{7,14}$'),
  instructions text CHECK (instructions IS NULL OR length(btrim(instructions)) BETWEEN 1 AND 1000),
  departure_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, task_id),
  FOREIGN KEY (tenant_id, tenant_kind) REFERENCES tawsel.tenants (tenant_id, kind),
  FOREIGN KEY (tenant_id, driver_id) REFERENCES tawsel.drivers,
  CHECK (branch_id IS NULL),
  CHECK (integration_id IS NULL),
  CHECK (updated_at >= created_at)
);

CREATE TABLE tawsel.task_source_addresses (
  tenant_id uuid NOT NULL,
  task_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('address', 'confirmed-pin')),
  address_text text CHECK (address_text IS NULL OR length(btrim(address_text)) BETWEEN 1 AND 500),
  latitude double precision CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision CHECK (longitude BETWEEN -180 AND 180),
  PRIMARY KEY (tenant_id, task_id),
  FOREIGN KEY (tenant_id, task_id) REFERENCES tawsel.b2c_tasks ON DELETE RESTRICT,
  CHECK ((kind = 'address' AND address_text IS NOT NULL AND latitude IS NULL AND longitude IS NULL)
    OR (kind = 'confirmed-pin' AND latitude IS NOT NULL AND longitude IS NOT NULL))
);

CREATE TABLE tawsel.task_collection_amounts (
  tenant_id uuid NOT NULL,
  task_id uuid NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 9007199254740991),
  currency text NOT NULL CHECK (currency = 'EGP'),
  exponent smallint NOT NULL CHECK (exponent = 2),
  PRIMARY KEY (tenant_id, task_id),
  FOREIGN KEY (tenant_id, task_id) REFERENCES tawsel.b2c_tasks ON DELETE RESTRICT
);

CREATE TABLE tawsel.task_intake_events (
  tenant_id uuid NOT NULL,
  task_id uuid NOT NULL,
  event_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('task.independentCreated', 'task.independentRevised')),
  revision bigint NOT NULL CHECK (revision > 0),
  source_id uuid NOT NULL,
  action_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, event_id),
  UNIQUE (tenant_id, task_id, revision),
  FOREIGN KEY (tenant_id, task_id) REFERENCES tawsel.b2c_tasks,
  FOREIGN KEY (tenant_id, source_id, action_id) REFERENCES tawsel.command_identities
);

CREATE INDEX b2c_tasks_driver_created ON tawsel.b2c_tasks
  (tenant_id, driver_id, created_at DESC, task_id DESC);
