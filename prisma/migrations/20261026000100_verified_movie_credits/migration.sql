ALTER TABLE "Movie" ADD COLUMN "audioLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], ADD COLUMN "audioLanguageSource" TEXT;

CREATE TABLE "Person" (
  "slug" VARCHAR(120) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "biography" TEXT NOT NULL,
  "professions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sourceUrl" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL,
  "portraitUrl" TEXT,
  "portraitLicenseUrl" TEXT,
  "portraitAttribution" TEXT,
  "portraitSourceUrl" TEXT,
  CONSTRAINT "Person_pkey" PRIMARY KEY ("slug"),
  CONSTRAINT "Person_licensed_portrait" CHECK ("portraitUrl" IS NULL OR ("portraitLicenseUrl" IS NOT NULL AND "portraitAttribution" IS NOT NULL AND "portraitSourceUrl" IS NOT NULL))
);
CREATE TABLE "MovieCredit" (
  "id" TEXT NOT NULL,
  "movieId" TEXT NOT NULL,
  "personSlug" VARCHAR(120) NOT NULL,
  "job" VARCHAR(120) NOT NULL,
  "department" VARCHAR(80) NOT NULL,
  "characterName" VARCHAR(160),
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "sourceUrl" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MovieCredit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MovieCredit_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MovieCredit_personSlug_fkey" FOREIGN KEY ("personSlug") REFERENCES "Person"("slug") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Person_name_idx" ON "Person"("name");
CREATE UNIQUE INDEX "MovieCredit_movieId_personSlug_job_key" ON "MovieCredit"("movieId", "personSlug", "job");
CREATE INDEX "MovieCredit_personSlug_movieId_idx" ON "MovieCredit"("personSlug", "movieId");
CREATE INDEX "MovieCredit_movieId_displayOrder_idx" ON "MovieCredit"("movieId", "displayOrder");
