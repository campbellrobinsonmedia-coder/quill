-- AlterTable
ALTER TABLE "Project" ADD COLUMN "titlePageAuthor" TEXT,
ADD COLUMN "titlePageContact" TEXT,
ADD COLUMN "titlePageBasedOn" TEXT;

-- AlterTable
ALTER TABLE "Draft" ADD COLUMN "sceneNumbersLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastLockedVersionId" TEXT;

-- AlterTable
ALTER TABLE "DraftVersion" ADD COLUMN "revisionColor" TEXT;

-- CreateTable
CREATE TABLE "DraftComment" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DraftComment_draftId_idx" ON "DraftComment"("draftId");

-- CreateIndex
CREATE INDEX "DraftComment_elementId_idx" ON "DraftComment"("elementId");

-- AddForeignKey
ALTER TABLE "DraftComment" ADD CONSTRAINT "DraftComment_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
