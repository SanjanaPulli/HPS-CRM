DELETE FROM "Attendance" 
WHERE "empId" = 'HPS260040' 
AND DATE("timestamp") = CURRENT_DATE;