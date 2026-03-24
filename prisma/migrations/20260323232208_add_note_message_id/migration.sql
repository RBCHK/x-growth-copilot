-- Delete existing notes that have no messageId (legacy notes without message binding)
DELETE FROM "Note";

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "messageId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
