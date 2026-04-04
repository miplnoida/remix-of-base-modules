
-- BN Module Events table for cross-module event publishing
CREATE TABLE public.bn_module_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  published_by TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed BOOLEAN NOT NULL DEFAULT false,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for polling unconsumed events
CREATE INDEX idx_bn_module_events_unconsumed ON public.bn_module_events (event_type, consumed) WHERE consumed = false;

-- Index for entity lookup
CREATE INDEX idx_bn_module_events_entity ON public.bn_module_events (entity_type, entity_id);

-- Enable realtime for event subscribers
ALTER PUBLICATION supabase_realtime ADD TABLE public.bn_module_events;

-- BN Payment Instruction table (bridge to payment module)
CREATE TABLE public.bn_payment_instruction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id UUID,
  claim_id UUID,
  ssn TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XCD',
  payment_method TEXT NOT NULL DEFAULT 'EFT',
  bank_code TEXT,
  account_number TEXT,
  due_date DATE NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'one_off',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  paid_date DATE,
  payment_reference TEXT,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bn_payment_instruction_ssn ON public.bn_payment_instruction (ssn);
CREATE INDEX idx_bn_payment_instruction_status ON public.bn_payment_instruction (status);
CREATE INDEX idx_bn_payment_instruction_award ON public.bn_payment_instruction (award_id);
