-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "fromDate" TIMESTAMP(3),
ADD COLUMN     "halfDaySession" TEXT,
ADD COLUMN     "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "toDate" TIMESTAMP(3);
