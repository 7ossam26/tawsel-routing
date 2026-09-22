-- P05 keys are retained. Existing keys alone confer no access: trusted P07/P08
-- provisioning must create the typed tenant/account/integration bindings below.
CREATE TABLE tawsel.tenants (
  tenant_id uuid PRIMARY KEY REFERENCES tawsel.tenant_keys,
  kind text NOT NULL CHECK (kind IN ('company', 'personal')),
  enabled boolean NOT NULL DEFAULT true,
  access_revision bigint NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, kind)
);

CREATE TABLE tawsel.capabilities (
  capability text PRIMARY KEY
);
INSERT INTO tawsel.capabilities VALUES
 ('monitor.read'), ('planning.manage'), ('location.review'), ('execution.own'),
 ('correction.own'), ('reports.read'), ('reports.export'), ('intake.prepare'),
 ('assignment.manage'), ('return.receive'), ('return.dispose'),
 ('identity.provision'), ('integration.manage'), ('diagnostics.read');

CREATE TABLE tawsel.accounts (
  tenant_id uuid NOT NULL,
  account_id uuid NOT NULL UNIQUE,
  tenant_kind text NOT NULL,
  source_kind text NOT NULL DEFAULT 'account' CHECK (source_kind = 'account'),
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, account_id),
  UNIQUE (tenant_id, account_id, tenant_kind),
  FOREIGN KEY (tenant_id, tenant_kind) REFERENCES tawsel.tenants (tenant_id, kind),
  FOREIGN KEY (tenant_id, account_id, source_kind) REFERENCES tawsel.command_sources (tenant_id, source_id, kind)
);
CREATE UNIQUE INDEX one_personal_account ON tawsel.accounts (tenant_id) WHERE tenant_kind = 'personal';

-- Authentication subject is issuer + opaque subject, never username/email/role.
CREATE TABLE tawsel.identity_subjects (
  issuer text NOT NULL CHECK (length(issuer) BETWEEN 1 AND 2048),
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 512),
  tenant_id uuid NOT NULL,
  account_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (issuer, subject),
  UNIQUE (account_id),
  FOREIGN KEY (tenant_id, account_id) REFERENCES tawsel.accounts
);

CREATE TABLE tawsel.branches (
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  tenant_kind text NOT NULL DEFAULT 'company' CHECK (tenant_kind = 'company'),
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, branch_id),
  FOREIGN KEY (tenant_id, tenant_kind) REFERENCES tawsel.tenants (tenant_id, kind)
);
CREATE TABLE tawsel.roles (
  tenant_id uuid NOT NULL,
  role_id uuid NOT NULL,
  tenant_kind text NOT NULL DEFAULT 'company' CHECK (tenant_kind = 'company'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  PRIMARY KEY (tenant_id, role_id),
  FOREIGN KEY (tenant_id, tenant_kind) REFERENCES tawsel.tenants (tenant_id, kind)
);
CREATE TABLE tawsel.role_capabilities (
  tenant_id uuid NOT NULL,
  role_id uuid NOT NULL,
  capability text NOT NULL REFERENCES tawsel.capabilities,
  allowed boolean NOT NULL,
  PRIMARY KEY (tenant_id, role_id, capability),
  FOREIGN KEY (tenant_id, role_id) REFERENCES tawsel.roles
);
CREATE TABLE tawsel.memberships (
  tenant_id uuid NOT NULL,
  account_id uuid NOT NULL,
  tenant_kind text NOT NULL,
  role_id uuid,
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, account_id),
  FOREIGN KEY (tenant_id, account_id, tenant_kind) REFERENCES tawsel.accounts (tenant_id, account_id, tenant_kind),
  FOREIGN KEY (tenant_id, role_id) REFERENCES tawsel.roles,
  CHECK ((tenant_kind = 'company' AND role_id IS NOT NULL) OR (tenant_kind = 'personal' AND role_id IS NULL))
);
CREATE TABLE tawsel.user_capability_exceptions (
  tenant_id uuid NOT NULL,
  account_id uuid NOT NULL,
  capability text NOT NULL REFERENCES tawsel.capabilities,
  effect text NOT NULL CHECK (effect IN ('inherit', 'allow', 'deny')),
  PRIMARY KEY (tenant_id, account_id, capability),
  FOREIGN KEY (tenant_id, account_id) REFERENCES tawsel.memberships
);
CREATE TABLE tawsel.membership_branches (
  tenant_id uuid NOT NULL,
  account_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  PRIMARY KEY (tenant_id, account_id, branch_id),
  FOREIGN KEY (tenant_id, account_id) REFERENCES tawsel.memberships,
  FOREIGN KEY (tenant_id, branch_id) REFERENCES tawsel.branches
);
CREATE TABLE tawsel.drivers (
  tenant_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  account_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, driver_id),
  UNIQUE (tenant_id, account_id),
  FOREIGN KEY (tenant_id, account_id) REFERENCES tawsel.memberships
);
CREATE TABLE tawsel.integrations (
  tenant_id uuid NOT NULL,
  integration_id uuid NOT NULL UNIQUE,
  tenant_kind text NOT NULL DEFAULT 'company' CHECK (tenant_kind = 'company'),
  source_kind text NOT NULL DEFAULT 'integration' CHECK (source_kind = 'integration'),
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, integration_id),
  FOREIGN KEY (tenant_id, tenant_kind) REFERENCES tawsel.tenants (tenant_id, kind),
  FOREIGN KEY (tenant_id, integration_id, source_kind) REFERENCES tawsel.command_sources (tenant_id, source_id, kind)
);
CREATE TABLE tawsel.integration_capabilities (
  tenant_id uuid NOT NULL,
  integration_id uuid NOT NULL,
  capability text NOT NULL REFERENCES tawsel.capabilities,
  PRIMARY KEY (tenant_id, integration_id, capability),
  FOREIGN KEY (tenant_id, integration_id) REFERENCES tawsel.integrations,
  CHECK (capability NOT IN ('execution.own', 'correction.own'))
);
CREATE TABLE tawsel.integration_branches (
  tenant_id uuid NOT NULL,
  integration_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  PRIMARY KEY (tenant_id, integration_id, branch_id),
  FOREIGN KEY (tenant_id, integration_id) REFERENCES tawsel.integrations,
  FOREIGN KEY (tenant_id, branch_id) REFERENCES tawsel.branches
);

-- Access readers hold this tenant row FOR SHARE to transaction end. All access
-- changes (including direct SQL/role edits) serialize with those readers. This
-- deliberately coarse per-tenant administration lock prevents stale grants from
-- committing a new write after a completed revocation. No application mutex.
CREATE FUNCTION tawsel.lock_access_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.tenant_id <> OLD.tenant_id THEN
    RAISE EXCEPTION 'access ownership is immutable' USING ERRCODE = '23514';
  END IF;
  UPDATE tawsel.tenants SET access_revision = access_revision + 1
    WHERE tenant_id = CASE WHEN TG_OP = 'DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DO $$
DECLARE access_table text;
BEGIN
  FOREACH access_table IN ARRAY ARRAY['accounts', 'identity_subjects', 'branches', 'roles',
    'role_capabilities', 'memberships', 'user_capability_exceptions', 'membership_branches',
    'drivers', 'integrations', 'integration_capabilities', 'integration_branches'] LOOP
    EXECUTE format('CREATE TRIGGER access_change BEFORE INSERT OR UPDATE OR DELETE ON tawsel.%I
      FOR EACH ROW EXECUTE FUNCTION tawsel.lock_access_change()', access_table);
  END LOOP;
END;
$$;

CREATE FUNCTION tawsel.retain_subject_binding() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'disable a subject binding; do not recycle it' USING ERRCODE = '23514';
  END IF;
  IF (NEW.issuer, NEW.subject, NEW.account_id) IS DISTINCT FROM (OLD.issuer, OLD.subject, OLD.account_id) THEN
    RAISE EXCEPTION 'subject binding is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER stable_subject BEFORE UPDATE OR DELETE ON tawsel.identity_subjects
  FOR EACH ROW EXECUTE FUNCTION tawsel.retain_subject_binding();
