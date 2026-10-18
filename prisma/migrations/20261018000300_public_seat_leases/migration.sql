-- No membership rows are removed or reset. Public capacity counts only leases
-- renewed by authorized sockets; private invitations keep their reserved seats.
CREATE INDEX "RoomMembership_roomId_status_lastSeenAt_idx"
ON "RoomMembership"("roomId", "status", "lastSeenAt");
