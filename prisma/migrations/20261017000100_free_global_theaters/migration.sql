-- Additive upgrade: preserve memberships and legacy billing records.
ALTER TABLE "CinemaRoom" DROP CONSTRAINT "room_capacity_bounds";
ALTER TABLE "CinemaRoom" ADD CONSTRAINT "room_capacity_bounds"
  CHECK (capacity BETWEEN 2 AND 1000 AND (visibility <> 'PRIVATE' OR capacity <= 50));
ALTER TABLE "RoomMembership" ADD COLUMN "invitationId" TEXT;
ALTER TABLE "RoomMembership" ADD CONSTRAINT "RoomMembership_invitationId_fkey"
  FOREIGN KEY ("invitationId") REFERENCES "Invitation"(id) ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "RoomMembership_invitationId_idx" ON "RoomMembership"("invitationId");
ALTER TABLE "RealtimeTicket" ADD COLUMN region VARCHAR(2) NOT NULL DEFAULT 'US';
ALTER TABLE "RealtimeTicket" ADD CONSTRAINT "ticket_region_format" CHECK (region ~ '^[A-Z]{2}$');
CREATE INDEX "room_upcoming_public" ON "CinemaRoom"("scheduledAt")
  WHERE visibility = 'PUBLIC' AND "endedAt" IS NULL AND "scheduledAt" IS NOT NULL;
