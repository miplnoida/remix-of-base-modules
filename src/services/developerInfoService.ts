import { supabase } from "@/integrations/supabase/client";

export interface DevInfoScreen {
  id: string;
  screen_code: string;
  screen_name: string;
  module_name: string | null;
  submodule_name: string | null;
  route_url: string | null;
  menu_path: string | null;
  screen_type: string | null;
  functional_summary: string | null;
  business_purpose: string | null;
  primary_user_roles: string | null;
  trigger_context: string | null;
  upstream_screens: string | null;
  downstream_screens: string | null;
  documentation_status: string;
  is_active: boolean;
  last_ai_analysis_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface DevInfoTableMap {
  id: string;
  screen_id: string;
  table_name: string;
  table_type: string;
  purpose: string | null;
  remarks: string | null;
}

export interface DevInfoLogic {
  id: string;
  screen_id: string;
  logic_type: string;
  logic_title: string;
  logic_description: string | null;
  execution_order: number;
}

export interface DevInfoField {
  id: string;
  screen_id: string;
  field_name: string;
  field_label: string | null;
  control_type: string | null;
  data_type: string | null;
  is_required: boolean;
  source_table: string | null;
  source_column: string | null;
  validation_rule: string | null;
  default_logic: string | null;
  edit_rule: string | null;
  visibility_rule: string | null;
  remarks: string | null;
  sort_order: number;
}

export interface DevInfoAction {
  id: string;
  screen_id: string;
  action_name: string;
  action_type: string | null;
  action_description: string | null;
  permission_required: string | null;
  business_logic: string | null;
  tables_affected: string | null;
  api_or_service_called: string | null;
  downstream_effect: string | null;
  remarks: string | null;
}

export interface DevInfoDependency {
  id: string;
  screen_id: string;
  dependency_type: string;
  dependency_name: string;
  dependency_details: string | null;
  remarks: string | null;
}

export interface DevInfoAuditBehavior {
  id: string;
  screen_id: string;
  audit_type: string | null;
  audit_description: string | null;
  is_enabled: boolean;
  remarks: string | null;
}

export interface DevInfoDocument {
  id: string;
  screen_id: string;
  document_type: string | null;
  document_name: string | null;
  document_reference: string | null;
  remarks: string | null;
}

export interface FullDevInfo {
  screen: DevInfoScreen;
  tables: DevInfoTableMap[];
  logic: DevInfoLogic[];
  fields: DevInfoField[];
  actions: DevInfoAction[];
  dependencies: DevInfoDependency[];
  audit: DevInfoAuditBehavior[];
  documents: DevInfoDocument[];
}

export const developerInfoService = {
  async getScreenByRoute(routeUrl: string): Promise<DevInfoScreen | null> {
    const { data, error } = await supabase
      .from('dev_info_screens')
      .select('*')
      .eq('route_url', routeUrl)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getFullDevInfo(screenId: string): Promise<FullDevInfo | null> {
    const [screenRes, tablesRes, logicRes, fieldsRes, actionsRes, depsRes, auditRes, docsRes] = await Promise.all([
      supabase.from('dev_info_screens').select('*').eq('id', screenId).single(),
      supabase.from('dev_info_table_maps').select('*').eq('screen_id', screenId),
      supabase.from('dev_info_logic').select('*').eq('screen_id', screenId).order('execution_order'),
      supabase.from('dev_info_fields').select('*').eq('screen_id', screenId).order('sort_order'),
      supabase.from('dev_info_actions').select('*').eq('screen_id', screenId),
      supabase.from('dev_info_dependencies').select('*').eq('screen_id', screenId),
      supabase.from('dev_info_audit').select('*').eq('screen_id', screenId),
      supabase.from('dev_info_documents').select('*').eq('screen_id', screenId),
    ]);

    if (screenRes.error || !screenRes.data) return null;

    return {
      screen: screenRes.data,
      tables: tablesRes.data || [],
      logic: logicRes.data || [],
      fields: fieldsRes.data || [],
      actions: actionsRes.data || [],
      dependencies: depsRes.data || [],
      audit: auditRes.data || [],
      documents: docsRes.data || [],
    };
  },

  async logAccess(params: {
    screenId?: string;
    screenCode: string;
    accessedBy: string;
    userRole: string;
    actionType?: string;
  }) {
    await supabase.from('dev_info_access_log').insert({
      screen_id: params.screenId || null,
      screen_code: params.screenCode,
      accessed_by: params.accessedBy,
      user_role: params.userRole,
      action_type: params.actionType || 'view',
    });
  },

  async getAllScreens(filters?: { module?: string; status?: string }): Promise<DevInfoScreen[]> {
    let query = supabase.from('dev_info_screens').select('*').order('module_name').order('screen_name');
    if (filters?.module) query = query.eq('module_name', filters.module);
    if (filters?.status) query = query.eq('documentation_status', filters.status);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async updateScreen(id: string, updates: Partial<DevInfoScreen>) {
    const { data, error } = await supabase
      .from('dev_info_screens')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async triggerAIAnalysis(screenId: string, routeUrl: string) {
    const { data, error } = await supabase.functions.invoke('analyze-screen-devinfo', {
      body: { screenId, routeUrl },
    });
    if (error) throw error;
    return data;
  },

  async getModuleList(): Promise<string[]> {
    const { data, error } = await supabase
      .from('dev_info_screens')
      .select('module_name')
      .not('module_name', 'is', null)
      .order('module_name');
    if (error) throw error;
    const unique = [...new Set((data || []).map(d => d.module_name).filter(Boolean))];
    return unique as string[];
  },
};
