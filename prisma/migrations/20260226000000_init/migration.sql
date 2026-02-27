-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('REPLY', 'POST', 'THREAD', 'ARTICLE');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'POSTED');

-- CreateEnum
CREATE TYPE "SlotType" AS ENUM ('POST', 'REPLY');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('EMPTY', 'FILLED', 'POSTED');

-- CreateEnum
CREATE TYPE "VoiceBankType" AS ENUM ('REPLY', 'POST');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'DRAFT',
    "originalPostText" TEXT,
    "originalPostUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceBankEntry" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "VoiceBankType" NOT NULL,
    "topic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceBankEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledSlot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "slotType" "SlotType" NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'EMPTY',
    "content" TEXT,
    "conversationId" TEXT,

    CONSTRAINT "ScheduledSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyConfig" (
    "id" TEXT NOT NULL,
    "postsPerDay" INTEGER NOT NULL DEFAULT 2,
    "replySessionsPerDay" INTEGER NOT NULL DEFAULT 4,
    "timeSlots" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyConfig_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledSlot" ADD CONSTRAINT "ScheduledSlot_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
