-- Rename FILLED → SCHEDULED in SlotStatus enum (data-safe)
ALTER TYPE "SlotStatus" RENAME VALUE 'FILLED' TO 'SCHEDULED';
