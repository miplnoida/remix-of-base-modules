
-- ============================================================
-- COMPREHENSIVE AUDIT TRIGGER UNIFICATION
-- Drop ALL old trg_audit_* triggers (using audit_table_changes)
-- Add fn_audit_row_change triggers to tables that only had old triggers
-- Drop the legacy audit_table_changes function
-- ============================================================

-- Step 1: Drop ALL old-style triggers (audit_table_changes function)
DROP TRIGGER IF EXISTS trg_audit_api_registry ON api_registry;
DROP TRIGGER IF EXISTS trg_audit_api_settings ON api_settings;
DROP TRIGGER IF EXISTS trg_audit_bema_audit_cases ON bema_audit_cases;
DROP TRIGGER IF EXISTS trg_audit_bema_registrations ON bema_registrations;
DROP TRIGGER IF EXISTS trg_audit_er_master ON er_master;
DROP TRIGGER IF EXISTS trg_audit_ip_master ON ip_master;
DROP TRIGGER IF EXISTS trg_audit_ip_self_employ ON ip_self_employ;
DROP TRIGGER IF EXISTS trg_audit_profiles ON profiles;
DROP TRIGGER IF EXISTS trg_audit_system_settings ON system_settings;
DROP TRIGGER IF EXISTS trg_audit_tb_self_emp_contrib_rate ON tb_self_emp_contrib_rate;
DROP TRIGGER IF EXISTS trg_audit_workflow_instances ON workflow_instances;
DROP TRIGGER IF EXISTS trg_audit_cn_receipt ON cn_receipt;
DROP TRIGGER IF EXISTS trg_audit_cn_batch ON cn_batch;
DROP TRIGGER IF EXISTS trg_audit_tb_currencies ON tb_currencies;
DROP TRIGGER IF EXISTS trg_audit_cn_cash_count ON cn_cash_count;
DROP TRIGGER IF EXISTS audit_cn_card_machine ON cn_card_machine;
DROP TRIGGER IF EXISTS audit_cn_batch_card_transaction ON cn_batch_card_transaction;
DROP TRIGGER IF EXISTS audit_cn_batch_cheque_verification_changes ON cn_batch_cheque_verification;

-- Step 2: Create fn_audit_row_change triggers on tables that only had the old trigger
-- (Tables that already have audit_table_changes trigger using fn_audit_row_change are fine)

CREATE TRIGGER audit_table_changes
  AFTER INSERT OR UPDATE OR DELETE ON ip_master
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();

CREATE TRIGGER audit_table_changes
  AFTER INSERT OR UPDATE OR DELETE ON ip_self_employ
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();

CREATE TRIGGER audit_table_changes
  AFTER INSERT OR UPDATE OR DELETE ON tb_currencies
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();

CREATE TRIGGER audit_table_changes
  AFTER INSERT OR UPDATE OR DELETE ON cn_cash_count
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();

CREATE TRIGGER audit_table_changes
  AFTER INSERT OR UPDATE OR DELETE ON api_settings
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();

CREATE TRIGGER audit_table_changes
  AFTER INSERT OR UPDATE OR DELETE ON api_registry
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();

CREATE TRIGGER audit_table_changes
  AFTER INSERT OR UPDATE OR DELETE ON workflow_instances
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();

CREATE TRIGGER audit_table_changes
  AFTER INSERT OR UPDATE OR DELETE ON cn_card_machine
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();

CREATE TRIGGER audit_table_changes
  AFTER INSERT OR UPDATE OR DELETE ON cn_batch_card_transaction
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();

CREATE TRIGGER audit_table_changes
  AFTER INSERT OR UPDATE OR DELETE ON cn_batch_cheque_verification
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();

CREATE TRIGGER audit_table_changes
  AFTER INSERT OR UPDATE OR DELETE ON tb_self_emp_contrib_rate
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();

-- Step 3: Drop the legacy audit_table_changes function (no longer needed)
DROP FUNCTION IF EXISTS audit_table_changes() CASCADE;
