-- CreateEnum
CREATE TYPE "ReferenceKind" AS ENUM ('LINK', 'FILE');

-- CreateTable
CREATE TABLE "Reference" (
    "id" TEXT NOT NULL,
    "worldNoteId" TEXT,
    "seriesId" TEXT,
    "seasonId" TEXT,
    "beatId" TEXT,
    "characterId" TEXT,
    "kind" "ReferenceKind" NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reference_worldNoteId_idx" ON "Reference"("worldNoteId");

-- CreateIndex
CREATE INDEX "Reference_seriesId_idx" ON "Reference"("seriesId");

-- CreateIndex
CREATE INDEX "Reference_seasonId_idx" ON "Reference"("seasonId");

-- CreateIndex
CREATE INDEX "Reference_beatId_idx" ON "Reference"("beatId");

-- CreateIndex
CREATE INDEX "Reference_characterId_idx" ON "Reference"("characterId");

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_worldNoteId_fkey" FOREIGN KEY ("worldNoteId") REFERENCES "WorldNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_beatId_fkey" FOREIGN KEY ("beatId") REFERENCES "Beat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
