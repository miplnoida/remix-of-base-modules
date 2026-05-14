
-- Create tb_c3_status master table
CREATE TABLE IF NOT EXISTS public.tb_c3_status (
  code VARCHAR(10) PRIMARY KEY,
  description VARCHAR(50) NOT NULL,
  isactive BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.tb_c3_status ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow read access to all authenticated users" ON public.tb_c3_status
  FOR SELECT USING (true);

-- Insert initial records
INSERT INTO public.tb_c3_status (code, description, isactive) VALUES
  ('DFT', 'Draft', true),
  ('VRE', 'Rejected', true),
  ('DEL', 'Deleted', true),
  ('VAC', 'Accepted', true),
  ('PEN', 'Pending', true)
ON CONFLICT (code) DO NOTHING;

-- Add index on cn_c3_reported.period for filtering performance
CREATE INDEX IF NOT EXISTS idx_cn_c3_reported_period ON public.cn_c3_reported (period);

-- Add index on cn_c3_reported.posting_status
CREATE INDEX IF NOT EXISTS idx_cn_c3_reported_posting_status ON public.cn_c3_reported (posting_status);

-- Add index on cn_c3_reported.payer_type
CREATE INDEX IF NOT EXISTS idx_cn_c3_reported_payer_type ON public.cn_c3_reported (payer_type);

-- Add composite index for common filter combo
CREATE INDEX IF NOT EXISTS idx_cn_c3_reported_payer_period ON public.cn_c3_reported (payer_type, period DESC);

-- Add index for schedule_no filtering
CREATE INDEX IF NOT EXISTS idx_cn_c3_reported_sequence_no ON public.cn_c3_reported (sequence_no);

-- Add index for date_received filtering
CREATE INDEX IF NOT EXISTS idx_cn_c3_reported_date_received ON public.cn_c3_reported (date_received);

-- Add index for date_entered filtering
CREATE INDEX IF NOT EXISTS idx_cn_c3_reported_date_entered ON public.cn_c3_reported (date_entered);
