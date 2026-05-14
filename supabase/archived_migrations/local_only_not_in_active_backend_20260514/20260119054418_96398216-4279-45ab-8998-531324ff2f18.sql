-- Remove workflow_instance_id column from ip_master table
DROP INDEX IF EXISTS idx_ip_master_workflow_instance;
ALTER TABLE public.ip_master DROP COLUMN IF EXISTS workflow_instance_id;