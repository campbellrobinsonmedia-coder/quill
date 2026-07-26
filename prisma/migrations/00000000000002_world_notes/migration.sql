-- CreateTable
CREATE TABLE "WorldNote" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorldNote_projectId_idx" ON "WorldNote"("projectId");

-- AddForeignKey
ALTER TABLE "WorldNote" ADD CONSTRAINT "WorldNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
