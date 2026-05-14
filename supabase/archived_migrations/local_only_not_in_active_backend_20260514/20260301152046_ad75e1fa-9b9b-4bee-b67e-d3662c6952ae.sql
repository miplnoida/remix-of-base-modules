-- Add is_verified column to ip_wages
ALTER TABLE ip_wages ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Add unique constraint on (c3_id, ssn) to prevent duplicate SSNs per C3
-- First drop if exists to be safe
ALTER TABLE ip_wages DROP CONSTRAINT IF EXISTS ip_wages_c3_ssn_unique;
ALTER TABLE ip_wages ADD CONSTRAINT ip_wages_c3_ssn_unique UNIQUE (c3_id, ssn);