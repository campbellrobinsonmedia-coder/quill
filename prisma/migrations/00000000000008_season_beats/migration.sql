-- CreateTable
CREATE TABLE "SeasonBeat" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "projectId" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonBeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeasonBeat_seasonId_idx" ON "SeasonBeat"("seasonId");

-- CreateIndex
CREATE INDEX "SeasonBeat_projectId_idx" ON "SeasonBeat"("projectId");

-- AddForeignKey
ALTER TABLE "SeasonBeat" ADD CONSTRAINT "SeasonBeat_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonBeat" ADD CONSTRAINT "SeasonBeat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
