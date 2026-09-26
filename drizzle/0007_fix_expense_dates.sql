-- Migration: Fix expense dates stored as UTC-midnight (from YYYY-MM-DD parsing)
-- For Trinidad & Tobago (America/Port_of_Spain, UTC-4) we add 4 hours

BEGIN;

-- Backup affected rows (so we can inspect or roll back if needed)
CREATE TABLE IF NOT EXISTS expense_date_fix_backup AS
SELECT id, date AS old_date
FROM expenses
WHERE (date AT TIME ZONE 'UTC')::time = time '00:00:00'
  AND (date AT TIME ZONE 'America/Port_of_Spain')::date <> (date AT TIME ZONE 'UTC')::date;

-- Update affected expense rows by adding 4 hours
UPDATE expenses
SET date = date + interval '4 hours',
    updated_at = now()
WHERE (date AT TIME ZONE 'UTC')::time = time '00:00:00'
  AND (date AT TIME ZONE 'America/Port_of_Spain')::date <> (date AT TIME ZONE 'UTC')::date;

COMMIT;

-- NOTE:
-- Run `npm run db:migration` to apply this migration. Review the backup table
-- `expense_date_fix_backup` before applying if you want to verify affected rows.
