-- AlterTable
ALTER TABLE "OutlineCard" ADD COLUMN "location" TEXT,
ADD COLUMN "emotion" TEXT;

-- CreateTable
CREATE TABLE "_CharacterToOutlineCard" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CharacterToOutlineCard_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CharacterToOutlineCard_B_index" ON "_CharacterToOutlineCard"("B");

-- AddForeignKey
ALTER TABLE "_CharacterToOutlineCard" ADD CONSTRAINT "_CharacterToOutlineCard_A_fkey" FOREIGN KEY ("A") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacterToOutlineCard" ADD CONSTRAINT "_CharacterToOutlineCard_B_fkey" FOREIGN KEY ("B") REFERENCES "OutlineCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
