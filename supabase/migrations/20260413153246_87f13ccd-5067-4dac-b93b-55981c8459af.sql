
-- 1. Create workflow_step_notifications table
CREATE TABLE IF NOT EXISTS public.workflow_step_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  module_id UUID REFERENCES public.app_modules(id) ON DELETE SET NULL,
  recipient_type TEXT NOT NULL DEFAULT 'step_approver',
  recipient_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by step
CREATE INDEX idx_workflow_step_notifications_step_id ON public.workflow_step_notifications(step_id);

-- 2. Extend workflow_action_notifications with new columns
ALTER TABLE public.workflow_action_notifications
  ADD COLUMN IF NOT EXISTS recipient_type TEXT NOT NULL DEFAULT 'next_step_approver',
  ADD COLUMN IF NOT EXISTS recipient_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.app_modules(id) ON DELETE SET NULL;

-- 3. Seed step-entry notifications for existing workflow steps (In-App to step_approver)
INSERT INTO public.workflow_step_notifications (step_id, notification_type, recipient_type, is_enabled)
SELECT ws.id, 'In-App', 'step_approver', true
FROM public.workflow_steps ws
WHERE NOT EXISTS (
  SELECT 1 FROM public.workflow_step_notifications wsn WHERE wsn.step_id = ws.id
);

-- 4. Seed action notifications for existing end_workflow actions (In-App to initiator)
INSERT INTO public.workflow_action_notifications (action_id, notification_type, recipient_type, is_enabled)
SELECT wsa.id, 'In-App', 'initiator', true
FROM public.workflow_step_actions wsa
WHERE wsa.next_step_type = 'end_workflow'
AND NOT EXISTS (
  SELECT 1 FROM public.workflow_action_notifications wan 
  WHERE wan.action_id = wsa.id AND wan.recipient_type = 'initiator'
);
