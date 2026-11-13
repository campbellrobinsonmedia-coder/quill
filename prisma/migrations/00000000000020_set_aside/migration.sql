-- AlterTable
ALTER TABLE "Beat" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OutlineCard" ADD COLUMN     "parked" BOOLEAN NOT NULL DEFAULT false;
