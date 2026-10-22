-- AlterTable
ALTER TABLE "OutlineCard" ADD COLUMN     "beatId" TEXT;

-- CreateIndex
CREATE INDEX "OutlineCard_beatId_idx" ON "OutlineCard"("beatId");

-- AddForeignKey
ALTER TABLE "OutlineCard" ADD CONSTRAINT "OutlineCard_beatId_fkey" FOREIGN KEY ("beatId") REFERENCES "Beat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: the old model had a beat point at a card ("Beat.linkedCardId").
-- The new Plan board has scenes sit under a beat, so flip each link around.
-- Only project-level beats (a beat on an episode's or script's own beat
-- sheet) appear on that board. A card can only sit under one beat, so if
-- several beats pointed at the same card, the earliest beat wins. The old
-- linkedCardId column is left in place, untouched.
UPDATE "OutlineCard" AS c
SET "beatId" = link."id"
FROM (
  SELECT DISTINCT ON ("linkedCardId") "id", "linkedCardId"
  FROM "Beat"
  WHERE "linkedCardId" IS NOT NULL
    AND "projectId" IS NOT NULL
    AND "seasonId" IS NULL
    AND "seriesId" IS NULL
  ORDER BY "linkedCardId", "order", "createdAt"
) AS link
WHERE c."id" = link."linkedCardId"
  AND c."projectId" = (SELECT b."projectId" FROM "Beat" b WHERE b."id" = link."id");
