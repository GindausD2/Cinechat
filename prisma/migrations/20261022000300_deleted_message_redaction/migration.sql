-- Keep live messages nonempty while allowing erased deletion tombstones.
-- Existing deleted rows remain valid; bounded maintenance erases their text.
ALTER TABLE "ChatMessage" DROP CONSTRAINT "message_nonempty";
ALTER TABLE "ChatMessage" ADD CONSTRAINT "message_nonempty" CHECK (deleted OR length(btrim(body)) > 0);
