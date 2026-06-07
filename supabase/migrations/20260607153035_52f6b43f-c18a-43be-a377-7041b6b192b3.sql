
-- ============================================================
-- BN Bank / EFT / Cheque — Configurable Masters
-- ============================================================

-- 1. Bank master ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.bn_bank_master (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code       varchar(40) NOT NULL UNIQUE,
  country_code    varchar(8)  NOT NULL,
  bank_name       varchar(200) NOT NULL,
  swift_code      varchar(20),
  clearing_code   varchar(40),
  default_currency varchar(8) DEFAULT 'XCD',
  active          boolean NOT NULL DEFAULT true,
  notes           text,
  created_by      varchar(50),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      varchar(50),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_bank_master TO authenticated;
GRANT ALL ON public.bn_bank_master TO service_role;
CREATE INDEX IF NOT EXISTS ix_bn_bank_master_country ON public.bn_bank_master(country_code);

-- 2. Bank branch ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.bn_bank_branch (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code       varchar(40) NOT NULL REFERENCES public.bn_bank_master(bank_code) ON UPDATE CASCADE ON DELETE RESTRICT,
  branch_code     varchar(40) NOT NULL,
  branch_name     varchar(200) NOT NULL,
  routing_number  varchar(40),
  address_snapshot jsonb,
  active          boolean NOT NULL DEFAULT true,
  created_by      varchar(50),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      varchar(50),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bank_code, branch_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_bank_branch TO authenticated;
GRANT ALL ON public.bn_bank_branch TO service_role;
CREATE INDEX IF NOT EXISTS ix_bn_bank_branch_bank ON public.bn_bank_branch(bank_code);

-- 3. Payment method master -----------------------------------
CREATE TABLE IF NOT EXISTS public.bn_payment_method (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method_code              varchar(30) NOT NULL UNIQUE,
  method_name              varchar(120) NOT NULL,
  requires_bank_account    boolean NOT NULL DEFAULT false,
  requires_postal_address  boolean NOT NULL DEFAULT false,
  generates_eft_file       boolean NOT NULL DEFAULT false,
  consumes_cheque_stock    boolean NOT NULL DEFAULT false,
  active                   boolean NOT NULL DEFAULT true,
  sort_order               integer NOT NULL DEFAULT 0,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_payment_method TO authenticated;
GRANT ALL ON public.bn_payment_method TO service_role;

-- 4. EFT format master ---------------------------------------
CREATE TABLE IF NOT EXISTS public.bn_eft_format (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  format_code      varchar(60) NOT NULL UNIQUE,
  format_name      varchar(200) NOT NULL,
  country_code     varchar(8),
  bank_code        varchar(40) REFERENCES public.bn_bank_master(bank_code) ON UPDATE CASCADE ON DELETE SET NULL,
  file_extension   varchar(10) NOT NULL DEFAULT 'txt',
  delimiter        varchar(10),
  record_separator varchar(10) NOT NULL DEFAULT E'\n',
  date_format      varchar(40) NOT NULL DEFAULT 'YYYYMMDD',
  amount_format    varchar(40) NOT NULL DEFAULT 'INTEGER_CENTS',
  amount_decimals  integer NOT NULL DEFAULT 2,
  header_required  boolean NOT NULL DEFAULT true,
  trailer_required boolean NOT NULL DEFAULT true,
  encoding         varchar(20) NOT NULL DEFAULT 'UTF-8',
  active           boolean NOT NULL DEFAULT true,
  notes            text,
  created_by       varchar(50),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       varchar(50),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_eft_format TO authenticated;
GRANT ALL ON public.bn_eft_format TO service_role;
CREATE INDEX IF NOT EXISTS ix_bn_eft_format_country ON public.bn_eft_format(country_code);

-- 5. EFT format field layout ---------------------------------
CREATE TABLE IF NOT EXISTS public.bn_eft_format_field (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  format_code     varchar(60) NOT NULL REFERENCES public.bn_eft_format(format_code) ON UPDATE CASCADE ON DELETE CASCADE,
  record_type     varchar(10) NOT NULL CHECK (record_type IN ('HEADER','DETAIL','TRAILER')),
  order_index     integer NOT NULL,
  field_name      varchar(80) NOT NULL,
  source_field    varchar(200),
  start_position  integer,
  length          integer,
  padding         varchar(10) NOT NULL DEFAULT 'NONE' CHECK (padding IN ('NONE','LEFT','RIGHT','ZERO')),
  pad_char        varchar(2) NOT NULL DEFAULT ' ',
  required        boolean NOT NULL DEFAULT false,
  default_value   text,
  transform       varchar(40),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (format_code, record_type, order_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_eft_format_field TO authenticated;
GRANT ALL ON public.bn_eft_format_field TO service_role;
CREATE INDEX IF NOT EXISTS ix_bn_eft_format_field_fmt ON public.bn_eft_format_field(format_code, record_type, order_index);

-- 6. Extend existing batch + eft file with format link & response state
ALTER TABLE public.bn_payment_batch
  ADD COLUMN IF NOT EXISTS eft_format_code      varchar(60),
  ADD COLUMN IF NOT EXISTS bank_response_status varchar(30),
  ADD COLUMN IF NOT EXISTS bank_response_at     timestamptz;

ALTER TABLE public.bn_eft_file
  ADD COLUMN IF NOT EXISTS eft_format_code varchar(60);

-- 7. Re-use shared updated_at trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    PERFORM 1;
  END IF;
END$$;

CREATE TRIGGER trg_bn_bank_master_uat        BEFORE UPDATE ON public.bn_bank_master        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bn_bank_branch_uat        BEFORE UPDATE ON public.bn_bank_branch        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bn_payment_method_uat     BEFORE UPDATE ON public.bn_payment_method     FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bn_eft_format_uat         BEFORE UPDATE ON public.bn_eft_format         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bn_eft_format_field_uat   BEFORE UPDATE ON public.bn_eft_format_field   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Seed defaults -------------------------------------------
INSERT INTO public.bn_payment_method (method_code, method_name, requires_bank_account, requires_postal_address, generates_eft_file, consumes_cheque_stock, sort_order)
VALUES
  ('EFT',               'Electronic Funds Transfer (EFT)', true,  false, true,  false, 10),
  ('CHEQUE',            'Cheque',                          false, true,  false, true,  20),
  ('CASH_PICKUP',       'Cash Pickup',                     false, false, false, false, 30),
  ('INTERNAL_TRANSFER', 'Internal Transfer',               false, false, false, false, 40)
ON CONFLICT (method_code) DO NOTHING;

-- Two generic EFT formats so admins have a starting point (channel SEED-)
INSERT INTO public.bn_eft_format (format_code, format_name, country_code, file_extension, delimiter, date_format, amount_format, amount_decimals, header_required, trailer_required, notes)
VALUES
  ('SEED-EFT_GENERIC_FIXED',     'SEED-Generic Fixed-Width EFT', NULL, 'txt', NULL,  'YYYYMMDD', 'INTEGER_CENTS', 2, true, true, 'Seeded template: fixed-width header/detail/trailer.'),
  ('SEED-EFT_GENERIC_DELIMITED', 'SEED-Generic Delimited EFT',   NULL, 'csv', ',',   'YYYY-MM-DD', 'DECIMAL',     2, true, true, 'Seeded template: comma-delimited.')
ON CONFLICT (format_code) DO NOTHING;

-- Fields for the delimited seed
INSERT INTO public.bn_eft_format_field (format_code, record_type, order_index, field_name, source_field, padding, required, transform)
VALUES
  ('SEED-EFT_GENERIC_DELIMITED','HEADER',1,'RecordType',NULL,'NONE',true,NULL),
  ('SEED-EFT_GENERIC_DELIMITED','HEADER',2,'BatchNumber','batch.batch_number','NONE',true,NULL),
  ('SEED-EFT_GENERIC_DELIMITED','HEADER',3,'BatchDate','batch.batch_date','NONE',true,'DATE_FMT'),
  ('SEED-EFT_GENERIC_DELIMITED','DETAIL',1,'PayeeName','profile.account_holder_name','NONE',true,'UPPER'),
  ('SEED-EFT_GENERIC_DELIMITED','DETAIL',2,'BankCode','profile.bank_code','NONE',true,NULL),
  ('SEED-EFT_GENERIC_DELIMITED','DETAIL',3,'BranchCode','profile.branch_code','NONE',false,NULL),
  ('SEED-EFT_GENERIC_DELIMITED','DETAIL',4,'AccountNumber','profile.account_number_masked','NONE',true,'DIGITS'),
  ('SEED-EFT_GENERIC_DELIMITED','DETAIL',5,'Amount','instruction.amount','NONE',true,NULL),
  ('SEED-EFT_GENERIC_DELIMITED','DETAIL',6,'Currency','instruction.currency','NONE',true,NULL),
  ('SEED-EFT_GENERIC_DELIMITED','DETAIL',7,'Reference','instruction.reference','NONE',false,NULL),
  ('SEED-EFT_GENERIC_DELIMITED','TRAILER',1,'RecordType',NULL,'NONE',true,NULL),
  ('SEED-EFT_GENERIC_DELIMITED','TRAILER',2,'Count','batch.control_count','NONE',true,NULL),
  ('SEED-EFT_GENERIC_DELIMITED','TRAILER',3,'TotalAmount','batch.control_total','NONE',true,NULL)
ON CONFLICT DO NOTHING;

-- 9. Register admin screens in app_modules -------------------
-- Parent: bn_payment_preparation = bfaed564-14ce-47a1-816b-8dd5fb9fa539
WITH parent AS (SELECT 'bfaed564-14ce-47a1-816b-8dd5fb9fa539'::uuid AS id)
INSERT INTO public.app_modules (name, display_name, route, parent_id, show_in_menu, sort_order, is_enabled, primary_table)
VALUES
  ('bn_bank_master',         'Bank Master',       '/bn/config/payment-masters?tab=banks',     (SELECT id FROM parent), true, 110, true, 'bn_bank_master'),
  ('bn_bank_branch',         'Bank Branches',     '/bn/config/payment-masters?tab=branches',  (SELECT id FROM parent), true, 111, true, 'bn_bank_branch'),
  ('bn_payment_method',      'Payment Methods',   '/bn/config/payment-masters?tab=methods',   (SELECT id FROM parent), true, 112, true, 'bn_payment_method'),
  ('bn_eft_format',          'EFT Formats',       '/bn/config/payment-masters?tab=formats',   (SELECT id FROM parent), true, 113, true, 'bn_eft_format'),
  ('bn_eft_format_field',    'EFT Field Layout',  '/bn/config/payment-masters?tab=layout',    (SELECT id FROM parent), true, 114, true, 'bn_eft_format_field')
ON CONFLICT DO NOTHING;

-- 10. Standard actions -- relies on existing auto_admin_action_permission trigger
INSERT INTO public.module_actions (module_id, action_name, display_name)
SELECT m.id, a.action_name, a.display_name
FROM public.app_modules m
CROSS JOIN (VALUES
  ('view',   'View'),
  ('create', 'Create'),
  ('edit',   'Edit'),
  ('delete', 'Delete')
) AS a(action_name, display_name)
WHERE m.name IN ('bn_bank_master','bn_bank_branch','bn_payment_method','bn_eft_format','bn_eft_format_field')
ON CONFLICT (module_id, action_name) DO NOTHING;
