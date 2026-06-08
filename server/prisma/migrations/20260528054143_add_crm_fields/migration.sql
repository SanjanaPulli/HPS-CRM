/*
  Warnings:

  - You are about to drop the column `domain` on the `Employee` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_empId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_empId_fkey";

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "domain",
ADD COLUMN     "dailyWorkStatus" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "joiningDate" TEXT,
ADD COLUMN     "password" TEXT NOT NULL DEFAULT 'hps@1234',
ADD COLUMN     "position" TEXT,
ADD COLUMN     "project" TEXT,
ADD COLUMN     "projectStatus" TEXT,
ADD COLUMN     "salary" TEXT DEFAULT 'Not Disclosed',
ADD COLUMN     "teamLead" TEXT,
ALTER COLUMN "contact" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_empId_fkey" FOREIGN KEY ("empId") REFERENCES "Employee"("empId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_empId_fkey" FOREIGN KEY ("empId") REFERENCES "Employee"("empId") ON DELETE CASCADE ON UPDATE CASCADE;
