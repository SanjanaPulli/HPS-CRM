UPDATE "Attendance"
SET "checkInTime" = "timestamp"
WHERE "checkInTime" IS NULL;