-- P08: all source identifiers and credential grants are scoped, never recycled.
CREATE TABLE tawsel.provisioning_sources (
  tenant_id uuid NOT NULL,
  integration_id uuid NOT NULL,
  issuer text NOT NULL,
  PRIMARY KEY (tenant_id,integration_id),
  FOREIGN KEY (tenant_id,integration_id) REFERENCES tawsel.integrations
);
CREATE TABLE tawsel.service_credentials (
  credential_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  integration_id uuid NOT NULL,
  secret_hash text NOT NULL CHECK (secret_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  FOREIGN KEY (tenant_id,integration_id) REFERENCES tawsel.provisioning_sources
);
-- Only the operator bootstrap can reserve an existing issuer subject. An ERP
-- credential cannot bind an arbitrary issuer identity, even an unbound one.
CREATE TABLE tawsel.provisioning_subject_grants (
  issuer text NOT NULL,
  subject text NOT NULL,
  tenant_id uuid NOT NULL,
  integration_id uuid NOT NULL,
  PRIMARY KEY (issuer,subject),
  FOREIGN KEY (tenant_id,integration_id) REFERENCES tawsel.provisioning_sources
);
CREATE TABLE tawsel.provisioning_records (
  tenant_id uuid NOT NULL,
  integration_id uuid NOT NULL,
  entity text NOT NULL CHECK (entity IN ('source','branch','role','user','driver')),
  external_id text NOT NULL CHECK (length(external_id) BETWEEN 1 AND 256),
  resource_id uuid NOT NULL,
  source_revision bigint NOT NULL CHECK (source_revision BETWEEN 1 AND 9007199254740991),
  payload_hash text NOT NULL,
  last_action_id uuid NOT NULL,
  state jsonb NOT NULL,
  PRIMARY KEY (tenant_id,integration_id,entity,external_id),
  UNIQUE (tenant_id,integration_id,entity,resource_id),
  FOREIGN KEY (tenant_id,integration_id) REFERENCES tawsel.provisioning_sources,
  FOREIGN KEY (tenant_id,integration_id,last_action_id)
    REFERENCES tawsel.command_identities (tenant_id,source_id,action_id)
);
CREATE TABLE tawsel.issuer_reconciliation (
  tenant_id uuid NOT NULL,
  integration_id uuid NOT NULL,
  account_id uuid NOT NULL,
  issuer text NOT NULL,
  subject text NOT NULL,
  desired_enabled boolean NOT NULL,
  generation bigint NOT NULL DEFAULT 1,
  status text NOT NULL CHECK (status IN ('pending','running','retry','ready')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_id uuid,
  lease_until timestamptz,
  last_error text,
  PRIMARY KEY (tenant_id,account_id),
  FOREIGN KEY (tenant_id,integration_id) REFERENCES tawsel.provisioning_sources,
  FOREIGN KEY (tenant_id,account_id) REFERENCES tawsel.accounts,
  FOREIGN KEY (issuer,subject) REFERENCES tawsel.provisioning_subject_grants
);
CREATE INDEX issuer_reconciliation_due ON tawsel.issuer_reconciliation (next_attempt_at)
  WHERE status <> 'ready';
