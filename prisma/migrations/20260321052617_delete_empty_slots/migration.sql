-- Data migration: remove all EMPTY scheduled slots.
-- Virtual slots are now computed on-the-fly from ScheduleConfig — no DB rows needed.
DELETE FROM "ScheduledSlot" WHERE status = 'EMPTY';
