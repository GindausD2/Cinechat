-- Additional tracks inherit their source's documented rights and availability.
-- Keep subtitleUrl for existing single-English-track configurations.
CREATE TABLE "SubtitleTrack" (
  "id" TEXT NOT NULL,
  "mediaSourceId" TEXT NOT NULL,
  "language" VARCHAR(35) NOT NULL,
  "label" VARCHAR(80) NOT NULL,
  "url" TEXT NOT NULL,
  CONSTRAINT "SubtitleTrack_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubtitleTrack_mediaSourceId_fkey" FOREIGN KEY ("mediaSourceId") REFERENCES "MediaSource"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SubtitleTrack_language_check" CHECK ("language" ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  CONSTRAINT "SubtitleTrack_label_check" CHECK (length(trim("label")) > 0)
);
CREATE UNIQUE INDEX "SubtitleTrack_mediaSourceId_language_key" ON "SubtitleTrack"("mediaSourceId", "language");
CREATE INDEX "Movie_createdAt_id_idx" ON "Movie"("createdAt", "id");
