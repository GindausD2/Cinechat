-- Nullable nonce preserves all existing messages and legacy API clients.
ALTER TABLE "ChatMessage" ADD COLUMN "clientNonce" UUID;
CREATE UNIQUE INDEX "ChatMessage_roomId_userId_clientNonce_key"
ON "ChatMessage"("roomId", "userId", "clientNonce");
