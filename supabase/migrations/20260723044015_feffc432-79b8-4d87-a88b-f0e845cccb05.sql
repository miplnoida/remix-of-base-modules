
-- Phase 4B3 Generic Readiness Convergence
-- 1) Extend sender readiness enum + columns
ALTER TYPE comm_hub_sender_readiness_state ADD VALUE IF NOT EXISTS 'NOT_CHECKED' BEFORE 'BLOCKED';
ALTER TYPE comm_hub_sender_readiness_state ADD VALUE IF NOT EXISTS 'CHECKING' AFTER 'NOT_CHECKED';
ALTER TYPE comm_hub_sender_readiness_state ADD VALUE IF NOT EXISTS 'BLOCKED_CONFIGURATION' AFTER 'CHECKING';
ALTER TYPE comm_hub_sender_readiness_state ADD VALUE IF NOT EXISTS 'BLOCKED_VERIFICATION' AFTER 'BLOCKED_CONFIGURATION';
ALTER TYPE comm_hub_sender_readiness_state ADD VALUE IF NOT EXISTS 'SUSPENDED' AFTER 'STALE';
