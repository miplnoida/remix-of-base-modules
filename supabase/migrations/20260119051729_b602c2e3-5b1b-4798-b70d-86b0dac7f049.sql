-- Add workflow_instance_id column to ip_master for workflow integration
ALTER TABLE public.ip_master 
ADD COLUMN IF NOT EXISTS workflow_instance_id UUID REFERENCES workflow_instances(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ip_master_workflow_instance 
ON public.ip_master(workflow_instance_id) 
WHERE workflow_instance_id IS NOT NULL;