-- Support expired-credential cleanup without scanning active account data.
CREATE INDEX "AuthToken_expiresAt_idx" ON "AuthToken"("expiresAt");
CREATE INDEX "Session_expires_idx" ON "Session"("expires");
CREATE INDEX "VerificationToken_expires_idx" ON "VerificationToken"("expires");
CREATE INDEX "Reaction_messageId_createdAt_idx" ON "Reaction"("messageId", "createdAt");
