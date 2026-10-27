-- Versioned terms acceptance and privacy acknowledgement, without IP/device data.
-- Existing users are not assigned a fabricated acknowledgement.
CREATE TABLE "PolicyAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" VARCHAR(32) NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PolicyAcceptance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PolicyAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PolicyAcceptance_userId_version_key" ON "PolicyAcceptance"("userId", "version");

-- Forward references allow account deletion to remove outgoing notifications.
ALTER TABLE "Notification" ADD COLUMN "actorId" TEXT;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Notification_actorId_idx" ON "Notification"("actorId");
