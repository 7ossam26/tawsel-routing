-- Retained causal metadata, committed with the existing command result. No
-- credentials or mutable client envelope rewriting; legacy identities remain valid.
CREATE TABLE tawsel.command_replay_metadata (
 tenant_id uuid NOT NULL, source_id uuid NOT NULL, action_id uuid NOT NULL,
 device_id uuid NOT NULL, generation bigint NOT NULL, device_sequence bigint NOT NULL,
 round_id uuid, activity_revision bigint, dependencies uuid[] NOT NULL,
 resolved_versions jsonb NOT NULL,
 PRIMARY KEY(tenant_id,source_id,action_id),
 FOREIGN KEY(tenant_id,source_id,action_id) REFERENCES tawsel.command_identities(tenant_id,source_id,action_id)
);
CREATE TRIGGER immutable_replay_metadata BEFORE UPDATE OR DELETE ON tawsel.command_replay_metadata
 FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();
