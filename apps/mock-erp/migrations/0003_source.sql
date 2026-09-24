CREATE TABLE mock_erp.source_commands (
 ordinal bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 action_id uuid PRIMARY KEY,
 envelope jsonb NOT NULL,
 payload_hash text NOT NULL,
 actor_subject text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','review-required')),
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 lease_id uuid,
 lease_until timestamptz,
 result jsonb,
 last_error text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 completed_at timestamptz,
 CHECK ((status='pending')=(result IS NULL)),
 CHECK (action_id=(envelope->>'actionId')::uuid)
);
CREATE TABLE mock_erp.source_records (
 kind text NOT NULL,
 external_id text NOT NULL,
 revision integer NOT NULL CHECK(revision>0),
 desired jsonb NOT NULL,
 command_id uuid NOT NULL REFERENCES mock_erp.source_commands(action_id),
 PRIMARY KEY(kind,external_id)
);
CREATE TABLE mock_erp.source_changes (
 kind text NOT NULL,
 external_id text NOT NULL,
 revision integer NOT NULL,
 desired jsonb NOT NULL,
 command_id uuid NOT NULL REFERENCES mock_erp.source_commands(action_id),
 PRIMARY KEY(kind,external_id,revision)
);
CREATE TABLE mock_erp.source_attempts (
 action_id uuid NOT NULL REFERENCES mock_erp.source_commands(action_id),
 number integer NOT NULL,
 lease_id uuid NOT NULL,
 started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 finished_at timestamptz,
 result text,
 PRIMARY KEY(action_id,number)
);
CREATE FUNCTION mock_erp.immutable_source() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR TG_TABLE_NAME='source_changes' THEN RAISE EXCEPTION 'Source evidence is append-only'; END IF;
 IF NEW.envelope IS DISTINCT FROM OLD.envelope OR NEW.payload_hash<>OLD.payload_hash OR NEW.actor_subject<>OLD.actor_subject OR NEW.action_id<>OLD.action_id OR NEW.ordinal<>OLD.ordinal THEN RAISE EXCEPTION 'Source command identity is immutable'; END IF;
 IF OLD.status<>'pending' THEN RAISE EXCEPTION 'Completed source result is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER source_command_immutable BEFORE UPDATE OR DELETE ON mock_erp.source_commands FOR EACH ROW EXECUTE FUNCTION mock_erp.immutable_source();
CREATE TRIGGER source_change_immutable BEFORE UPDATE OR DELETE ON mock_erp.source_changes FOR EACH ROW EXECUTE FUNCTION mock_erp.immutable_source();
