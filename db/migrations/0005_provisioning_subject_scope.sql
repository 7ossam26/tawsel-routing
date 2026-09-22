-- Enforce the worker's subject/source join in PostgreSQL as well as the command
-- adapter. Additive follow-up preserves already-applied P08 migration checksums.
ALTER TABLE tawsel.provisioning_subject_grants
  ADD CONSTRAINT provisioning_subject_grant_scope UNIQUE (issuer,subject,tenant_id,integration_id);
ALTER TABLE tawsel.issuer_reconciliation
  DROP CONSTRAINT issuer_reconciliation_issuer_subject_fkey,
  ADD CONSTRAINT issuer_reconciliation_subject_scope
    FOREIGN KEY (issuer,subject,tenant_id,integration_id)
    REFERENCES tawsel.provisioning_subject_grants (issuer,subject,tenant_id,integration_id);
