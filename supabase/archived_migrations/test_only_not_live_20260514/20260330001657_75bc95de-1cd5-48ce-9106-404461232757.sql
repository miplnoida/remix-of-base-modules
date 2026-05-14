
-- Create tb_pay_periods table
CREATE TABLE public.tb_pay_periods (
  code VARCHAR(5) PRIMARY KEY,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  entered_by VARCHAR(50),
  entered_on TIMESTAMPTZ DEFAULT now(),
  modified_by VARCHAR(50),
  modified_on TIMESTAMPTZ
);

-- Seed data
INSERT INTO public.tb_pay_periods (code, description, sort_order) VALUES
  ('W', 'Weekly', 1),
  ('2W', 'Bi-Weekly', 2),
  ('S', 'Semi-Monthly', 3),
  ('M', 'Monthly', 4),
  ('2M', '2x Monthly', 5);

-- Attach the existing audit trigger
CREATE TRIGGER trg_audit_tb_pay_periods
  AFTER INSERT OR UPDATE OR DELETE ON public.tb_pay_periods
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
