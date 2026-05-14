-- Create notice delivery log table
CREATE TABLE public.ce_notice_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID NOT NULL REFERENCES public.ce_notices(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL DEFAULT 1,
  channel VARCHAR(50) NOT NULL,
  recipient_address VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failure_reason TEXT,
  provider_message_id VARCHAR(255),
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ce_notice_delivery_log_notice ON public.ce_notice_delivery_log(notice_id);
CREATE INDEX idx_ce_notice_delivery_log_status ON public.ce_notice_delivery_log(status);

-- Add ACKNOWLEDGED and CANCELLED to status colors support
-- (ce_notices status column is VARCHAR so no enum change needed)

COMMENT ON TABLE public.ce_notice_delivery_log IS 'Audit trail of every delivery attempt for compliance notices';