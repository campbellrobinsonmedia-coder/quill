-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('SPARK', 'DEVELOPING', 'PROMOTED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "promotedProjectId" TEXT,
ADD COLUMN     "promotedSeriesId" TEXT,
ADD COLUMN     "status" "IdeaStatus" NOT NULL DEFAULT 'SPARK',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "title" TEXT;

-- CreateIndex
CREATE INDEX "Idea_status_idx" ON "Idea"("status");

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_promotedProjectId_fkey" FOREIGN KEY ("promotedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_promotedSeriesId_fkey" FOREIGN KEY ("promotedSeriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

