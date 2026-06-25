-- Remove character length constraints on title and notes in log_entries
ALTER TABLE log_entries DROP CONSTRAINT IF EXISTS log_entries_title_check;
ALTER TABLE log_entries DROP CONSTRAINT IF EXISTS log_entries_notes_check;
