import { supabase } from '@/integrations/supabase/client';

export interface QAKnowledgeEntry {
  id: string;
  title: string;
  description?: string;
  rule_type: string;
  module: string;
  submodule?: string;
  screen_path?: string;
  api_endpoint?: string;
  db_table?: string;
  workflow_step?: string;
  priority: string;
  status: string;
  rule_definition: Record<string, any>;
  expected_behavior?: string;
  positive_example?: Record<string, any>;
  negative_example?: Record<string, any>;
  boundary_conditions?: Record<string, any>;
  tags?: string[];
  version: number;
  is_latest: boolean;
  parent_id?: string;
  created_by?: string;
  created_by_code?: string;
  created_at: string;
  updated_at: string;
}

export interface QATestCase {
  id: string;
  knowledge_entry_id?: string;
  title: string;
  description?: string;
  test_type: string;
  module: string;
  submodule?: string;
  priority: string;
  status: string;
  test_config: Record<string, any>;
  expected_result: Record<string, any>;
  generation_source: string;
  is_mandatory: boolean;
  tags?: string[];
  version: number;
  created_at: string;
  updated_at: string;
}

export interface QAExecutionRun {
  id: string;
  run_name: string;
  run_type: string;
  trigger_source: string;
  triggered_by?: string;
  triggered_by_code?: string;
  release_version?: string;
  modules_targeted?: string[];
  change_reference?: string;
  status: string;
  total_tests: number;
  passed_count: number;
  failed_count: number;
  skipped_count: number;
  error_count: number;
  execution_duration_ms?: number;
  blocking_failures: number;
  deployment_blocked: boolean;
  summary_notes?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface QATestResult {
  id: string;
  run_id: string;
  test_case_id: string;
  status: string;
  request_payload?: Record<string, any>;
  expected_outcome?: Record<string, any>;
  actual_outcome?: Record<string, any>;
  diff_details?: Record<string, any>;
  error_message?: string;
  stack_trace?: string;
  execution_duration_ms?: number;
  executed_at?: string;
  notes?: string;
  created_at: string;
  qa_test_cases?: QATestCase;
}

export interface QAPipelineSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description?: string;
}

// ── Knowledge Entries ────────────────────────────────────────────────────────

export async function fetchKnowledgeEntries(filters?: {
  module?: string;
  rule_type?: string;
  priority?: string;
  status?: string;
  search?: string;
}) {
  let query = supabase
    .from('qa_knowledge_entries')
    .select('*')
    .eq('is_latest', true)
    .order('module')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.module) query = query.eq('module', filters.module);
  if (filters?.rule_type) query = query.eq('rule_type', filters.rule_type);
  if (filters?.priority) query = query.eq('priority', filters.priority);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) query = query.ilike('title', `%${filters.search}%`);

  return query;
}

export async function createKnowledgeEntry(entry: Partial<QAKnowledgeEntry>) {
  return supabase.from('qa_knowledge_entries').insert(entry as any).select().single();
}

export async function updateKnowledgeEntry(id: string, updates: Partial<QAKnowledgeEntry>) {
  // Create a new version (soft-versioning)
  const { data: existing } = await supabase
    .from('qa_knowledge_entries')
    .select('*')
    .eq('id', id)
    .single();

  if (!existing) return { error: { message: 'Entry not found' } };

  // Mark old as not latest
  await supabase.from('qa_knowledge_entries').update({ is_latest: false }).eq('id', id);

  // Insert new version
  return supabase.from('qa_knowledge_entries').insert({
    ...existing,
    ...updates,
    id: undefined,
    parent_id: existing.id,
    version: existing.version + 1,
    is_latest: true,
    updated_at: new Date().toISOString(),
  }).select().single();
}

// ── Test Cases ───────────────────────────────────────────────────────────────

export async function fetchTestCases(filters?: {
  module?: string;
  test_type?: string;
  priority?: string;
  status?: string;
  search?: string;
}) {
  let query = supabase
    .from('qa_test_cases')
    .select('*')
    .order('module')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.module) query = query.eq('module', filters.module);
  if (filters?.test_type) query = query.eq('test_type', filters.test_type);
  if (filters?.priority) query = query.eq('priority', filters.priority);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) query = query.ilike('title', `%${filters.search}%`);

  return query;
}

export async function createTestCase(tc: Partial<QATestCase>) {
  return supabase.from('qa_test_cases').insert(tc as any).select().single();
}

export async function updateTestCase(id: string, updates: Partial<QATestCase>) {
  return supabase.from('qa_test_cases').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
}

export async function deleteTestCase(id: string) {
  return supabase.from('qa_test_cases').update({ status: 'archived' }).eq('id', id);
}

// ── Execution Runs ───────────────────────────────────────────────────────────

export async function fetchExecutionRuns(filters?: {
  status?: string;
  run_type?: string;
  from_date?: string;
  to_date?: string;
  module?: string;
}) {
  let query = supabase
    .from('qa_execution_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.run_type) query = query.eq('run_type', filters.run_type);
  if (filters?.from_date) query = query.gte('created_at', filters.from_date);
  if (filters?.to_date) query = query.lte('created_at', filters.to_date);
  if (filters?.module) query = query.contains('modules_targeted', [filters.module]);

  return query;
}

export async function fetchRunResults(run_id: string) {
  return supabase
    .from('qa_test_results')
    .select(`
      *,
      qa_test_cases(id, title, test_type, priority, module, is_mandatory)
    `)
    .eq('run_id', run_id)
    .order('status', { ascending: false });
}

export async function triggerTestRun(options: {
  run_type?: string;
  modules?: string[];
  test_case_ids?: string[];
  triggered_by?: string;
  release_version?: string;
}) {
  return supabase.functions.invoke('qa-test-runner', { body: options });
}

export async function generateAITestCases(options: {
  knowledge_entry_id?: string;
  module?: string;
  test_types?: string[];
  triggered_by?: string;
}) {
  return supabase.functions.invoke('qa-ai-generator', { body: options });
}

// ── Pipeline Settings ────────────────────────────────────────────────────────

export async function fetchPipelineSettings() {
  return supabase.from('qa_pipeline_settings').select('*').order('setting_key');
}

export async function updatePipelineSetting(key: string, value: string) {
  return supabase
    .from('qa_pipeline_settings')
    .update({ setting_value: value, updated_at: new Date().toISOString() })
    .eq('setting_key', key);
}

// ── Distinct modules from knowledge entries ──────────────────────────────────
export async function fetchDistinctModules(): Promise<string[]> {
  const { data } = await supabase
    .from('qa_knowledge_entries')
    .select('module')
    .eq('is_latest', true)
    .eq('status', 'active');
  return [...new Set(data?.map(d => d.module) || [])].sort();
}
