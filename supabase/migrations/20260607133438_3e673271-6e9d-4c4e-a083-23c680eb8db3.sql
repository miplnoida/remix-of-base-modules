-- ─── 1. Extend bn_payment_instruction with missing columns ────────────
ALTER TABLE public.bn_payment_instruction
  ADD COLUMN IF NOT EXISTS batch_id uuid,
  ADD COLUMN IF NOT EXISTS office_code varchar(20),
  ADD COLUMN IF NOT EXISTS beneficiary_name varchar(200),
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS instruction_type varchar(40) DEFAULT 'PERIODIC',
  ADD COLUMN IF NOT EXISTS modified_by varchar(50),
  ADD COLUMN IF NOT EXISTS modified_at timestamptz,
  ADD COLUMN IF NOT EXISTS hold_reason text,
  ADD COLUMN IF NOT EXISTS hold_by varchar(50),
  ADD COLUMN IF NOT EXISTS hold_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by varchar(50),
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS exception_code varchar(40),
  ADD COLUMN IF NOT EXISTS exception_detail text,
  ADD COLUMN IF NOT EXISTS exception_at timestamptz,
  ADD COLUMN IF NOT EXISTS reissue_reason text,
  ADD COLUMN IF NOT EXISTS original_instruction_id uuid;

-- ─── 2. bn_payment_batch ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bn_payment_batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number varchar(60) NOT NULL UNIQUE,
  batch_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method varchar(20) NOT NULL DEFAULT 'MIXED',
  status varchar(30) NOT NULL DEFAULT 'OPEN',
  office_code varchar(20) NOT NULL DEFAULT 'HQ',
  total_items integer NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency varchar(8) NOT NULL DEFAULT 'XCD',
  validated_items integer NOT NULL DEFAULT 0,
  failed_items integer NOT NULL DEFAULT 0,
  issued_items integer NOT NULL DEFAULT 0,
  created_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  validated_by varchar(50),
  validated_at timestamptz,
  approved_by varchar(50),
  approved_at timestamptz,
  released_by varchar(50),
  released_at timestamptz,
  cancelled_by varchar(50),
  cancelled_at timestamptz,
  cancel_reason text,
  issue_started_at timestamptz,
  issue_completed_at timestamptz,
  issue_error_count integer NOT NULL DEFAULT 0,
  notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_payment_batch TO authenticated;
GRANT ALL ON public.bn_payment_batch TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_payment_batch_status ON public.bn_payment_batch(status);
CREATE INDEX IF NOT EXISTS idx_bn_payment_batch_date ON public.bn_payment_batch(batch_date);

-- ─── 3. bn_batch_item ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bn_batch_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.bn_payment_batch(id) ON DELETE CASCADE,
  instruction_id uuid NOT NULL REFERENCES public.bn_payment_instruction(id),
  item_status varchar(30) NOT NULL DEFAULT 'PENDING',
  sequence_number integer NOT NULL DEFAULT 1,
  ssn varchar(20) NOT NULL,
  claim_number varchar(60),
  beneficiary_name varchar(200),
  amount numeric(14,2) NOT NULL,
  currency varchar(8) NOT NULL DEFAULT 'XCD',
  payment_method varchar(40),
  period_start date,
  period_end date,
  instruction_type varchar(40) NOT NULL DEFAULT 'PERIODIC',
  validation_errors jsonb,
  cl_cheque_no varchar(40),
  issued_at timestamptz,
  issue_error text,
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by varchar(50)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_batch_item TO authenticated;
GRANT ALL ON public.bn_batch_item TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_batch_item_batch ON public.bn_batch_item(batch_id);
CREATE INDEX IF NOT EXISTS idx_bn_batch_item_instr ON public.bn_batch_item(instruction_id);

-- ─── 4. bn_payment_exception ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bn_payment_exception (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instruction_id uuid REFERENCES public.bn_payment_instruction(id),
  batch_id uuid REFERENCES public.bn_payment_batch(id),
  claim_id uuid,
  exception_type varchar(60) NOT NULL,
  description text,
  status varchar(20) NOT NULL DEFAULT 'OPEN',
  raised_by varchar(50),
  raised_at timestamptz NOT NULL DEFAULT now(),
  resolved_by varchar(50),
  resolved_at timestamptz,
  resolution_notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_payment_exception TO authenticated;
GRANT ALL ON public.bn_payment_exception TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_payment_exception_status ON public.bn_payment_exception(status);

-- ─── 5. bn_issue_record ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bn_issue_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.bn_payment_batch(id),
  batch_item_id uuid REFERENCES public.bn_batch_item(id),
  instruction_id uuid REFERENCES public.bn_payment_instruction(id),
  ssn varchar(20) NOT NULL,
  claim_number varchar(60),
  beneficiary_name varchar(200),
  survivor_id uuid,
  amount numeric(14,2) NOT NULL,
  currency varchar(8) NOT NULL DEFAULT 'XCD',
  issue_method varchar(20) NOT NULL DEFAULT 'CHEQUE',
  period_start date,
  period_end date,
  instruction_type varchar(40),
  target_table varchar(40) NOT NULL DEFAULT 'cl_cheques',
  status varchar(30) NOT NULL DEFAULT 'PENDING',
  cheque_number varchar(40),
  dd_reference varchar(80),
  issued_at timestamptz,
  issued_by varchar(50),
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  voided_at timestamptz,
  voided_by varchar(50),
  void_reason text,
  reissue_of uuid,
  hold_reason text,
  hold_released_at timestamptz,
  hold_released_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_issue_record TO authenticated;
GRANT ALL ON public.bn_issue_record TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_issue_record_batch ON public.bn_issue_record(batch_id);
CREATE INDEX IF NOT EXISTS idx_bn_issue_record_status ON public.bn_issue_record(status);

-- ─── 6. bn_post_issue_task ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bn_post_issue_task (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_record_id uuid REFERENCES public.bn_issue_record(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.bn_payment_batch(id),
  task_type varchar(60) NOT NULL,
  task_order integer NOT NULL DEFAULT 1,
  status varchar(30) NOT NULL DEFAULT 'PENDING',
  is_required boolean NOT NULL DEFAULT true,
  ssn varchar(20),
  claim_number varchar(60),
  cheque_number varchar(40),
  amount numeric(14,2),
  target_table varchar(60),
  executed_at timestamptz,
  executed_by varchar(50),
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  result_data jsonb,
  deferred_reason text,
  skip_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_post_issue_task TO authenticated;
GRANT ALL ON public.bn_post_issue_task TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_post_issue_task_status ON public.bn_post_issue_task(status);
CREATE INDEX IF NOT EXISTS idx_bn_post_issue_task_batch ON public.bn_post_issue_task(batch_id);

-- ─── 7. FK on bn_payment_instruction.batch_id (deferred until table existed) ───
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name='bn_payment_instruction_batch_id_fkey') THEN
    ALTER TABLE public.bn_payment_instruction
      ADD CONSTRAINT bn_payment_instruction_batch_id_fkey
      FOREIGN KEY (batch_id) REFERENCES public.bn_payment_batch(id) ON DELETE SET NULL;
  END IF;
END $$;