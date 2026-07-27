-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT,
    "premise" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Series_userId_idx" ON "Series"("userId");

-- CreateIndex
CREATE INDEX "Season_seriesId_idx" ON "Season"("seriesId");

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "seasonId" TEXT,
ADD COLUMN "episodeNumber" INTEGER,
ADD COLUMN "episodeTitle" TEXT,
ADD COLUMN "storyBy" TEXT,
ADD COLUMN "teleplayBy" TEXT;

-- CreateIndex
CREATE INDEX "Project_seasonId_idx" ON "Project"("seasonId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Character.projectId becomes optional, gains optional seriesId
ALTER TABLE "Character" DROP CONSTRAINT "Character_projectId_fkey";
ALTER TABLE "Character" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "Character" ADD COLUMN "seriesId" TEXT;

-- CreateIndex
CREATE INDEX "Character_seriesId_idx" ON "Character"("seriesId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: WorldNote.projectId becomes optional, gains optional seriesId
ALTER TABLE "WorldNote" DROP CONSTRAINT "WorldNote_projectId_fkey";
ALTER TABLE "WorldNote" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "WorldNote" ADD COLUMN "seriesId" TEXT;

-- CreateIndex
CREATE INDEX "WorldNote_seriesId_idx" ON "WorldNote"("seriesId");

-- AddForeignKey
ALTER TABLE "WorldNote" ADD CONSTRAINT "WorldNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldNote" ADD CONSTRAINT "WorldNote_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "OutlineCard" ADD COLUMN "storyThread" TEXT;
