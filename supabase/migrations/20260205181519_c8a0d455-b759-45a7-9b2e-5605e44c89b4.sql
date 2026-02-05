-- Add new levy threshold configuration columns to c3_config_details
ALTER TABLE c3_config_details 
ADD COLUMN IF NOT EXISTS levy_monthly_threshold NUMERIC DEFAULT 6500,
ADD COLUMN IF NOT EXISTS levy_use_monthly_when_exceeded BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN c3_config_details.levy_monthly_threshold IS 'Ceiling amount for total wages (week1-week6 excluding bonus) to trigger monthly levy calculation';
COMMENT ON COLUMN c3_config_details.levy_use_monthly_when_exceeded IS 'When true and wages exceed threshold, use monthly levy slabs instead of weekly/bi-weekly';

-- Update existing records with default values
UPDATE c3_config_details 
SET levy_monthly_threshold = 6500, 
    levy_use_monthly_when_exceeded = false 
WHERE levy_monthly_threshold IS NULL;