-- DropForeignKey
ALTER TABLE "public"."transaction_splits" DROP CONSTRAINT "transaction_splits_categoryId_fkey";

-- AlterTable
ALTER TABLE "transaction_splits" ALTER COLUMN "categoryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
