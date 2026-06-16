CREATE TABLE IF NOT EXISTS "Holiday" (
  "id"        SERIAL PRIMARY KEY,
  "date"      TIMESTAMP NOT NULL,
  "name"      VARCHAR(255) NOT NULL,
  "type"      VARCHAR(50) NOT NULL DEFAULT 'National',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);