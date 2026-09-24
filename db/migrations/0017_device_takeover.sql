-- One immutable transition per round generation. A token is disclosed only by
-- the latest confirmed snapshot read, never by the takeover result/context.
CREATE TABLE tawsel.device_takeovers (
 tenant_id uuid NOT NULL, round_id uuid NOT NULL, generation bigint NOT NULL CHECK(generation BETWEEN 2 AND 9007199254740991),
 account_id uuid NOT NULL, former_device_id uuid NOT NULL, device_id uuid NOT NULL,
 source_id uuid NOT NULL, action_id uuid NOT NULL, snapshot_token uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,round_id,generation), UNIQUE(tenant_id,source_id,action_id),
 FOREIGN KEY(tenant_id,round_id) REFERENCES tawsel.rounds,
 FOREIGN KEY(tenant_id,account_id) REFERENCES tawsel.accounts,
 FOREIGN KEY(tenant_id,source_id,action_id) REFERENCES tawsel.command_identities,
 CHECK(former_device_id<>device_id), CHECK(account_id=source_id)
);
CREATE TRIGGER preserve_device_takeovers BEFORE UPDATE OR DELETE ON tawsel.device_takeovers FOR EACH ROW EXECUTE FUNCTION tawsel.retain_intake_history();

CREATE FUNCTION tawsel.check_owner_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.owner_device_id,NEW.device_generation) IS DISTINCT FROM ROW(OLD.owner_device_id,OLD.device_generation) THEN
  IF OLD.ended_at IS NOT NULL OR NEW.ended_at IS NOT NULL OR NEW.device_generation<>OLD.device_generation+1 OR NEW.owner_device_id=OLD.owner_device_id
   OR NOT EXISTS(SELECT 1 FROM tawsel.device_takeovers t WHERE t.tenant_id=NEW.tenant_id AND t.round_id=NEW.round_id AND t.generation=NEW.device_generation AND t.account_id=NEW.owner_account_id AND t.former_device_id=OLD.owner_device_id AND t.device_id=NEW.owner_device_id)
   OR NOT EXISTS(SELECT 1 FROM tawsel.workdays d WHERE d.tenant_id=NEW.tenant_id AND d.workday_id=NEW.workday_id AND d.ended_at IS NULL)
  THEN RAISE EXCEPTION 'owner transition requires an open round/day and next recorded generation' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER valid_owner_transition BEFORE UPDATE ON tawsel.rounds FOR EACH ROW EXECUTE FUNCTION tawsel.check_owner_transition();
