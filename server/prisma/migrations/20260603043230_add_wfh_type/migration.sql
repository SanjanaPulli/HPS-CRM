-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'Leave';

-- CreateTable
CREATE TABLE "OfficeSetting" (
    "id" SERIAL NOT NULL,
    "checkInTime" TEXT NOT NULL DEFAULT '09:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '18:00',
    "lateAfter" TEXT NOT NULL DEFAULT '09:15',
    "halfDayBefore" TEXT NOT NULL DEFAULT '13:00',
    "workingDays" TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat',
    "officeName" TEXT NOT NULL DEFAULT 'HPS Pvt Ltd',
    "officeAddress" TEXT NOT NULL DEFAULT '',
    "officePhone" TEXT NOT NULL DEFAULT '',
    "officeEmail" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeSetting_pkey" PRIMARY KEY ("id")
);
