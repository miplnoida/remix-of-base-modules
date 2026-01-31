-- Drop the old check constraint
ALTER TABLE cn_c3_reported DROP CONSTRAINT IF EXISTS cn_c3_reported_posting_status_check;

-- Add new check constraint with updated status codes
ALTER TABLE cn_c3_reported ADD CONSTRAINT cn_c3_reported_posting_status_check 
CHECK (posting_status IN ('DFT', 'PEN', 'VAC', 'REJ', 'DEL'));

-- Update any existing records with old status codes to new codes
UPDATE cn_c3_reported SET posting_status = 'DFT' WHERE posting_status = 'Z';
UPDATE cn_c3_reported SET posting_status = 'PEN' WHERE posting_status = 'P';
UPDATE cn_c3_reported SET posting_status = 'VAC' WHERE posting_status = 'V';
UPDATE cn_c3_reported SET posting_status = 'REJ' WHERE posting_status = 'D';