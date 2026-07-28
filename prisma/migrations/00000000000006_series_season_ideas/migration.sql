-- AlterTable
ALTER TABLE "Idea" ADD COLUMN "seriesId" TEXT,
ADD COLUMN "seasonId" TEXT;

-- CreateIndex
CREATE INDEX "Idea_seriesId_idx" ON "Idea"("seriesId");

-- CreateIndex
CREATE INDEX "Idea_seasonId_idx" ON "Idea"("seasonId");

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
