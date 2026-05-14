
CREATE TABLE public.db_diagram_saved_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES public.db_diagram_modules(id) ON DELETE CASCADE,
  layout_name TEXT NOT NULL DEFAULT 'Default',
  is_default BOOLEAN NOT NULL DEFAULT false,
  node_positions JSONB NOT NULL DEFAULT '{}',
  included_table_ids TEXT[] NOT NULL DEFAULT '{}',
  excluded_table_ids TEXT[] NOT NULL DEFAULT '{}',
  zoom_level NUMERIC DEFAULT 1,
  viewport_x NUMERIC DEFAULT 0,
  viewport_y NUMERIC DEFAULT 0,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_layouts_module ON public.db_diagram_saved_layouts(module_id);
CREATE UNIQUE INDEX idx_saved_layouts_default ON public.db_diagram_saved_layouts(module_id) WHERE is_default = true;
