-- P36: accepted start commands previously retained only server start time.
-- Capture original observations and relevant version assertions atomically with
-- the existing device metadata. Never backfill historical clocks from receipts.
ALTER TABLE tawsel.command_replay_metadata ADD COLUMN observation jsonb;
ALTER TABLE tawsel.command_replay_metadata ADD COLUMN expected_versions jsonb;
ALTER TABLE tawsel.command_replay_metadata ADD CONSTRAINT reporting_observation_shape
 CHECK (observation IS NULL OR (jsonb_typeof(observation)='object' AND observation ? 'observedAt' AND observation ? 'clock'));
ALTER TABLE tawsel.command_replay_metadata ADD CONSTRAINT reporting_versions_shape
 CHECK (expected_versions IS NULL OR jsonb_typeof(expected_versions)='object');
-- The existing immutable_replay_metadata trigger covers these additive fields.
