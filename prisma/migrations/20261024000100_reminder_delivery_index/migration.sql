-- Accelerate bounded pending-reminder delivery without changing existing rows.
CREATE INDEX "ScreeningReminder_sentAt_roomId_idx" ON "ScreeningReminder"("sentAt", "roomId");
