
-- ============================================================
-- Migration: Expand ip_master address columns to min varchar(50)
-- Columns affected: resident_addr1/2, mail_addr1/2, contact_addr1/2,
--                   spouse_addr1/2, ben_addr1/2
-- employer_address (200), employer_name (50), employer_town (50) are already >= 50 — skipped.
-- district (3) is a lookup code — not an address text field — skipped.
-- Safe: ALTER COLUMN TYPE to a LARGER size never causes data loss.
-- ============================================================

ALTER TABLE public.ip_master
  ALTER COLUMN resident_addr1 TYPE varchar(50),
  ALTER COLUMN resident_addr2 TYPE varchar(50),
  ALTER COLUMN mail_addr1     TYPE varchar(50),
  ALTER COLUMN mail_addr2     TYPE varchar(50),
  ALTER COLUMN contact_addr1  TYPE varchar(50),
  ALTER COLUMN contact_addr2  TYPE varchar(50),
  ALTER COLUMN spouse_addr1   TYPE varchar(50),
  ALTER COLUMN spouse_addr2   TYPE varchar(50),
  ALTER COLUMN ben_addr1      TYPE varchar(50),
  ALTER COLUMN ben_addr2      TYPE varchar(50);

-- Verify
DO $$
DECLARE
  col RECORD;
BEGIN
  FOR col IN
    SELECT column_name, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'ip_master'
      AND column_name  IN (
        'resident_addr1','resident_addr2','mail_addr1','mail_addr2',
        'contact_addr1','contact_addr2','spouse_addr1','spouse_addr2',
        'ben_addr1','ben_addr2'
      )
  LOOP
    IF col.character_maximum_length < 50 THEN
      RAISE EXCEPTION 'Column % is still only % chars — migration failed', col.column_name, col.character_maximum_length;
    END IF;
  END LOOP;
  RAISE NOTICE 'All address columns verified >= 50 chars';
END $$;
