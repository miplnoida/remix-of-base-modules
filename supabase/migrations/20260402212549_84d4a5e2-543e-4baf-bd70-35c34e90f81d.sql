
CREATE TABLE public.cn_card_machine_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text NOT NULL,
  payment_id integer NOT NULL,
  payment_sequence_no integer NOT NULL,
  current_card_machine_id uuid REFERENCES public.cn_card_machine(id),
  requested_card_machine_id uuid REFERENCES public.cn_card_machine(id),
  workflow_instance_id uuid REFERENCES public.workflow_instances(id),
  status text NOT NULL DEFAULT 'Pending',
  comment text NOT NULL,
  skip_comment text,
  requested_by text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  completed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cn_card_machine_change_requests_batch ON public.cn_card_machine_change_requests(batch_number);
CREATE INDEX idx_cn_card_machine_change_requests_status ON public.cn_card_machine_change_requests(status);
CREATE INDEX idx_cn_card_machine_change_requests_workflow ON public.cn_card_machine_change_requests(workflow_instance_id);

-- Add Reject action to the Payment-Batch Changes Approval Workflow step
INSERT INTO public.workflow_step_actions (id, step_id, action_name, action_type, next_step_type, end_state, is_final_action, display_order, remarks_required)
VALUES (
  gen_random_uuid(),
  'c6d8db29-3671-4857-b5bb-d99b48b7dbb6',
  'Reject',
  'Reject',
  'end_workflow',
  'Rejected',
  false,
  2,
  true
);
