-- Application validation backed by PostgreSQL invariants.
ALTER TABLE "CinemaRoom" ADD CONSTRAINT "room_capacity_bounds" CHECK (capacity BETWEEN 2 AND 50);
ALTER TABLE "CinemaRoom" ADD CONSTRAINT "room_position_nonnegative" CHECK (position >= 0 AND position < 'Infinity'::float8);
ALTER TABLE "Movie" ADD CONSTRAINT "movie_duration_positive" CHECK ("durationSeconds" > 0);
ALTER TABLE "Movie" ADD CONSTRAINT "movie_age_floor" CHECK ("minAge" >= 13);
ALTER TABLE "Invitation" ADD CONSTRAINT "invitation_use_bounds" CHECK ("maxUses" > 0 AND uses >= 0 AND uses <= "maxUses");
ALTER TABLE "ChatMessage" ADD CONSTRAINT "message_nonempty" CHECK (length(btrim(body)) > 0);
ALTER TABLE "Follow" ADD CONSTRAINT "no_self_follow" CHECK ("followerId" <> "followingId");
ALTER TABLE "Friendship" ADD CONSTRAINT "no_self_friendship" CHECK ("senderId" <> "receiverId");
ALTER TABLE "Block" ADD CONSTRAINT "no_self_block" CHECK ("blockerId" <> "blockedId");
CREATE UNIQUE INDEX "friendship_unordered_pair" ON "Friendship" (LEAST("senderId", "receiverId"), GREATEST("senderId", "receiverId"));
ALTER TABLE "MediaSource" ADD CONSTRAINT "rights_dates_ordered" CHECK ("validUntil" IS NULL OR "validUntil" > "validFrom");
ALTER TABLE "MediaSource" ADD CONSTRAINT "enabled_media_authorized" CHECK (NOT enabled OR authorized);
ALTER TABLE "WatchHistory" ADD CONSTRAINT "history_position_nonnegative" CHECK (position >= 0 AND position < 'Infinity'::float8);
