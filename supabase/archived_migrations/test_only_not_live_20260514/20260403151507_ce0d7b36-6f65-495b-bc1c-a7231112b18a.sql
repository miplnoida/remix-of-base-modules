
CREATE TABLE public.workflow_role_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  assigned_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id, workflow_id)
);

CREATE INDEX idx_wra_role_id ON public.workflow_role_assignments(role_id);
CREATE INDEX idx_wra_workflow_id ON public.workflow_role_assignments(workflow_id);
