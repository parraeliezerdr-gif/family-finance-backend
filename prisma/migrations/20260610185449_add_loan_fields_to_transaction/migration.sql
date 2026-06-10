-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "relatedLoanId" TEXT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_relatedLoanId_fkey" FOREIGN KEY ("relatedLoanId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
