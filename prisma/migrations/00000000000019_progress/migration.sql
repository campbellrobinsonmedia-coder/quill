-- AlterTable
ALTER TABLE "OutlineCard" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'idea';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "pageTarget" INTEGER;
