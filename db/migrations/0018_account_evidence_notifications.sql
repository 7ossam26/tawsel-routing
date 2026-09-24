-- Preserve integration recipients and their existing composite FK. Account
-- notifications are narrowly limited to these P20 facts and their own source.
ALTER TABLE tawsel.outbox_intents DROP CONSTRAINT outbox_intents_recipient_kind_check;
ALTER TABLE tawsel.outbox_intents ADD CHECK(recipient_kind IN ('integration','account'));
ALTER TABLE tawsel.outbox_intents ADD CHECK(recipient_kind<>'account' OR
 (recipient_id=source_id AND event_type IN ('device.executionTransferred','evidence.received')));
