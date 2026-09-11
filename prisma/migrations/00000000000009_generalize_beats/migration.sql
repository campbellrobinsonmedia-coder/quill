-- CreateTable
CREATE TABLE "Beat" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT,
    "seasonId" TEXT,
    "projectId" TEXT,
    "linkedCardId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Beat_seriesId_idx" ON "Beat"("seriesId");

-- CreateIndex
CREATE INDEX "Beat_seasonId_idx" ON "Beat"("seasonId");

-- CreateIndex
CREATE INDEX "Beat_projectId_idx" ON "Beat"("projectId");

-- CreateIndex
CREATE INDEX "Beat_linkedCardId_idx" ON "Beat"("linkedCardId");

-- AddForeignKey
ALTER TABLE "Beat" ADD CONSTRAINT "Beat_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beat" ADD CONSTRAINT "Beat_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beat" ADD CONSTRAINT "Beat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beat" ADD CONSTRAINT "Beat_linkedCardId_fkey" FOREIGN KEY ("linkedCardId") REFERENCES "OutlineCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate existing season-scoped beats forward
INSERT INTO "Beat" ("id", "seasonId", "projectId", "title", "summary", "order", "createdAt", "updatedAt")
SELECT "id", "seasonId", "projectId", "title", "summary", "order", "createdAt", "updatedAt" FROM "SeasonBeat";

-- DropTable
DROP TABLE "SeasonBeat";
