-- Create receipt cancel requests table
CREATE TABLE public.cn_receipt_cancel_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text NOT NULL,
  payment_id integer NOT NULL,
  receipt_id integer NOT NULL,
  receipt_total numeric,
  workflow_instance_id uuid REFERENCES workflow_instances(id),
  status text NOT NULL DEFAULT 'Pending',
  reason text NOT NULL,
  request_type text NOT NULL DEFAULT 'cancel_receipt',
  requested_by text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  completed_by text,
  skip_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cn_receipt_cancel_requests_batch ON cn_receipt_cancel_requests(batch_number);
CREATE INDEX idx_cn_receipt_cancel_requests_status ON cn_receipt_cancel_requests(status);
CREATE INDEX idx_cn_receipt_cancel_requests_payment ON cn_receipt_cancel_requests(payment_id);
CREATE INDEX idx_cn_receipt_cancel_requests_receipt ON cn_receipt_cancel_requests(receipt_id);

-- Auto-update updated_at trigger
CREATE TRIGGER update_cn_receipt_cancel_requests_updated_at
  BEFORE UPDATE ON public.cn_receipt_cancel_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Approve/Reject actions for the workflow step if not already present
INSERT INTO public.workflow_step_actions (step_id, action_name, action_type, next_step_type, end_state, is_final_action, display_order, remarks_required, result_status)
SELECT 'a072b471-3d03-4bab-86fa-bd45480a78d1', 'Approve', 'Approve', 'end_workflow', 'Approved', true, 1, false, 'Approved'
WHERE NOT EXISTS (
  SELECT 1 FROM public.workflow_step_actions
  WHERE step_id = 'a072b471-3d03-4bab-86fa-bd45480a78d1' AND action_type = 'Approve'
);

INSERT INTO public.workflow_step_actions (step_id, action_name, action_type, next_step_type, end_state, is_final_action, display_order, remarks_required, result_status)
SELECT 'a072b471-3d03-4bab-86fa-bd45480a78d1', 'Reject', 'Reject', 'end_workflow', 'Rejected', true, 2, true, 'Rejected'
WHERE NOT EXISTS (
  SELECT 1 FROM public.workflow_step_actions
  WHERE step_id = 'a072b471-3d03-4bab-86fa-bd45480a78d1' AND action_type = 'Reject'
);