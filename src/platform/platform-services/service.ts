import { supabase } from '@/integrations/supabase/client';
import { logAction } from '@/platform/audit/auditService';
import type {
  PlatformService,
  PlatformServiceContract,
  PlatformServiceConsumer,
  PlatformChecklistItem,
  PlatformModuleAssessment,
} from './types';

const db = supabase as any;

export async function listServices(): Promise<PlatformService[]> {
  const { data, error } = await db
    .from('core_platform_service')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlatformService[];
}

export async function listContracts(): Promise<PlatformServiceContract[]> {
  const { data, error } = await db.from('core_platform_service_contract').select('*').order('contract_code');
  if (error) throw error;
  return (data ?? []) as PlatformServiceContract[];
}

export async function listConsumers(): Promise<PlatformServiceConsumer[]> {
  const { data, error } = await db.from('core_platform_service_consumer').select('*').order('consumer_module_code');
  if (error) throw error;
  return (data ?? []) as PlatformServiceConsumer[];
}

export async function listChecklist(): Promise<PlatformChecklistItem[]> {
  const { data, error } = await db
    .from('core_platform_module_checklist_item')
    .select('*')
    .order('display_order');
  if (error) throw error;
  return (data ?? []) as PlatformChecklistItem[];
}

export async function listAssessments(): Promise<PlatformModuleAssessment[]> {
  const { data, error } = await db.from('core_platform_module_assessment').select('*');
  if (error) throw error;
  return (data ?? []) as PlatformModuleAssessment[];
}

/** Health check: verify at least one active role has the view permission granted. */
export async function checkAdminAccessHealth(): Promise<{ ok: boolean; message: string }> {
  const { data, error } = await db
    .from('role_permissions')
    .select('role_id, module_actions!inner(action_name, module_id)')
    .eq('module_actions.module_id', 'f0110011-0000-4000-8000-000000000001')
    .eq('module_actions.action_name', 'view')
    .eq('is_granted', true)
    .limit(1);
  if (error) return { ok: false, message: error.message };
  const ok = (data ?? []).length > 0;
  await logAction({
    event_code: 'PLATFORM_SERVICE_ADMIN_ACCESS_VERIFIED',
    action: 'HEALTH_CHECK',
    module_code: 'CORE',
    domain_code: 'GOVERNANCE',
    entity_type: 'core_platform_service',
    outcome: ok ? 'SUCCESS' : 'PARTIAL',
    notes: ok
      ? 'At least one admin role has Platform Service Catalogue access.'
      : 'No administrator role has access to the Platform Service Catalogue yet.',
  });
  return {
    ok,
    message: ok
      ? 'At least one administrator role has core.admin.platform_services.view granted.'
      : 'No administrator role has access to the Platform Service Catalogue yet. Grant core.admin.platform_services.view to the administrator role.',
  };
}
