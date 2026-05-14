
-- Posting queue status enum
DO $$ BEGIN
  CREATE TYPE ce_posting_status AS ENUM ('PENDING','PROCESSING','POSTED','FAILED','SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Posting Queue
CREATE TABLE IF NOT EXISTS public.ce_posting_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_system VARCHAR(50) NOT NULL,
  source_table VARCHAR(100) NOT NULL,
  source_pk VARCHAR(200) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  employer_id VARCHAR(20) NOT NULL,
  period VARCHAR(10),
  fund_type VARCHAR(20),
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status ce_posting_status NOT NULL DEFAULT 'PENDING',
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  error_message TEXT,
  ledger_entry_id UUID REFERENCES ce_employer_financial_ledger(id),
  idempotency_key VARCHAR(500) NOT NULL,
  job_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  processed_at TIMESTAMPTZ,
  CONSTRAINT uq_posting_queue_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX idx_posting_queue_status ON ce_posting_queue(status);
CREATE INDEX idx_posting_queue_employer ON ce_posting_queue(employer_id);
CREATE INDEX idx_posting_queue_next_retry ON ce_posting_queue(next_retry_at) WHERE status = 'FAILED';

-- 2. Job Run Log
CREATE TABLE IF NOT EXISTS public.ce_job_run_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  job_code VARCHAR(50),
  run_type VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  run_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_end TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
  records_read INT NOT NULL DEFAULT 0,
  records_posted INT NOT NULL DEFAULT 0,
  records_failed INT NOT NULL DEFAULT 0,
  records_skipped INT NOT NULL DEFAULT 0,
  summary_message TEXT,
  parameters JSONB,
  triggered_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_run_log_job ON ce_job_run_log(job_name, run_start DESC);
CREATE INDEX idx_job_run_log_status ON ce_job_run_log(status);

-- 3. Manual Rebuild Request
CREATE TABLE IF NOT EXISTS public.ce_manual_rebuild_request (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id VARCHAR(20) NOT NULL,
  from_period VARCHAR(10),
  to_period VARCHAR(10),
  request_type VARCHAR(30) NOT NULL DEFAULT 'FULL_REBUILD',
  requested_by VARCHAR(100) NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  outcome_summary TEXT,
  job_run_id UUID REFERENCES ce_job_run_log(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rebuild_request_status ON ce_manual_rebuild_request(status);
CREATE INDEX idx_rebuild_request_employer ON ce_manual_rebuild_request(employer_id);

-- 4. Add source traceability to ledger (safe idempotent adds)
DO $$ BEGIN
  ALTER TABLE ce_employer_financial_ledger ADD COLUMN source_system VARCHAR(50);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE ce_employer_financial_ledger ADD COLUMN source_pk VARCHAR(200);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE ce_employer_financial_ledger ADD COLUMN job_run_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 5. Add fund_type to reconciliation_exceptions
DO $$ BEGIN
  ALTER TABLE ce_reconciliation_exceptions ADD COLUMN fund_type VARCHAR(20);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE ce_reconciliation_exceptions ADD COLUMN severity VARCHAR(20) DEFAULT 'MEDIUM';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
