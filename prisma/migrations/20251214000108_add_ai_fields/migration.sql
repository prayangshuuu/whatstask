-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "geminiApiKey" TEXT;

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN IF NOT EXISTS "aiMessage" TEXT;
