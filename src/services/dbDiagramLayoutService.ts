import { supabase } from '@/integrations/supabase/client';

export interface SavedLayout {
  id: string;
  module_id: string | null;
  layout_name: string;
  is_default: boolean;
  node_positions: Record<string, { x: number; y: number }>;
  included_table_ids: string[];
  excluded_table_ids: string[];
  zoom_level: number;
  viewport_x: number;
  viewport_y: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchSavedLayouts(moduleId: string): Promise<SavedLayout[]> {
  const { data, error } = await supabase
    .from('db_diagram_saved_layouts' as any)
    .select('*')
    .eq('module_id', moduleId)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as any;
}

export async function saveLayout(layout: {
  id?: string;
  module_id: string;
  layout_name: string;
  is_default: boolean;
  node_positions: Record<string, { x: number; y: number }>;
  included_table_ids: string[];
  excluded_table_ids: string[];
  zoom_level: number;
  viewport_x: number;
  viewport_y: number;
  user_code: string;
}): Promise<SavedLayout> {
  if (layout.id) {
    const { data, error } = await supabase
      .from('db_diagram_saved_layouts' as any)
      .update({
        layout_name: layout.layout_name,
        is_default: layout.is_default,
        node_positions: layout.node_positions,
        included_table_ids: layout.included_table_ids,
        excluded_table_ids: layout.excluded_table_ids,
        zoom_level: layout.zoom_level,
        viewport_x: layout.viewport_x,
        viewport_y: layout.viewport_y,
        updated_by: layout.user_code,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', layout.id)
      .select()
      .single();
    if (error) throw error;
    return data as any;
  }

  // If marking as default, unset other defaults first
  if (layout.is_default) {
    await supabase
      .from('db_diagram_saved_layouts' as any)
      .update({ is_default: false } as any)
      .eq('module_id', layout.module_id)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('db_diagram_saved_layouts' as any)
    .insert({
      module_id: layout.module_id,
      layout_name: layout.layout_name,
      is_default: layout.is_default,
      node_positions: layout.node_positions,
      included_table_ids: layout.included_table_ids,
      excluded_table_ids: layout.excluded_table_ids,
      zoom_level: layout.zoom_level,
      viewport_x: layout.viewport_x,
      viewport_y: layout.viewport_y,
      created_by: layout.user_code,
      updated_by: layout.user_code,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as any;
}

export async function deleteLayout(layoutId: string): Promise<void> {
  const { error } = await supabase
    .from('db_diagram_saved_layouts' as any)
    .delete()
    .eq('id', layoutId);
  if (error) throw error;
}

export async function addTableToModuleMap(tableId: string, moduleId: string): Promise<void> {
  const { error } = await supabase
    .from('db_diagram_table_module_map' as any)
    .upsert({ table_id: tableId, module_id: moduleId } as any, { onConflict: 'table_id,module_id' });
  if (error) throw error;
}

export async function removeTableFromModuleMap(tableId: string, moduleId: string): Promise<void> {
  const { error } = await supabase
    .from('db_diagram_table_module_map' as any)
    .delete()
    .eq('table_id', tableId)
    .eq('module_id', moduleId);
  if (error) throw error;
}
