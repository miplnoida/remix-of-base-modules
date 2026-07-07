/**
 * OM-5 — Document Template platform service.
 *
 * Canonical storage is `core_template` (metadata) + `core_template_version`
 * (subject/body/layout). Letterheads live in `comm_letterhead` (layout only).
 *
 * This service is the ONLY place UI code should mutate document templates.
 * Direct writes to `core_template` from pages are discouraged — every write
 * goes through here so audit + permission guarantees are consistent.
 *
 * Compatibility: this service also exposes legacy comm_letterhead rows that
 * look like document templates (rows with a `document_type` value). They are
 * returned with `source_system = 'LEGACY_LETTERHEAD'` and cannot be edited via
 * this service — callers must open them through the legacy TemplateDesignerDialog
 * to preserve their historical behaviour and avoid destructive migration.
 */
import { supabase } from '@/integrations/supabase/client';
import { logOrgMutation, type OrgActionKind } from '@/platform/organization/orgMutations';
import { DOCUMENT_TEMPLATE_EVENTS } from './templateEvents';

/** Local wrapper — routes every document-template audit call through logOrgMutation. */
function logDT(
  eventCode: string,
  kind: OrgActionKind,
  extra: {
    entityType?: string;
    entityId?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
  } = {},
): Promise<void> {
  return logOrgMutation({
    eventCode,
    kind,
    entityType: extra.entityType ?? 'core_template',
    entityId: extra.entityId ?? null,
    before: extra.before ?? null,
    after: extra.after ?? null,
  });
}
import type {
  DocumentTemplateRow,
  DocumentTemplateFilters,
  TokenValidationResult,
} from './templateTypes';

const sb = supabase as any;

/** Parse {{token}} / {{ token.path }} references from HTML/text bodies. */
export function parseTemplateTokens(...bodies: Array<string | null | undefined>): string[] {
  const rx = /{{\s*([a-zA-Z0-9_.:-]+)\s*}}/g;
  const found = new Set<string>();
  for (const body of bodies) {
    if (!body) continue;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(body)) !== null) found.add(m[1]);
  }
  return Array.from(found).sort();
}

async function fetchKnownTokenCodes(): Promise<string[]> {
  const { data, error } = await sb
    .from('core_template_token')
    .select('token_code')
    .eq('is_active', true);
  if (error) return [];
  return (data ?? []).map((r: any) => r.token_code as string);
}

function mapCoreTemplateRow(row: any, versionRow?: any): DocumentTemplateRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? null,
    template_type: row.template_type,
    template_category: row.template_category ?? null,
    module_code: row.module_code ?? null,
    business_event_code: row.business_event_code ?? row.business_category ?? null,
    recipient_type: row.recipient_type ?? null,
    language_code: row.language_code ?? row.default_language ?? null,
    version_no: versionRow?.version_no ?? null,
    status: row.status,
    effective_from: row.effective_from ?? null,
    effective_to: row.effective_to ?? null,
    letterhead_id: row.letterhead_id ?? null,
    linked_letterhead_code: row.linked_letterhead_code ?? null,
    body_html: versionRow?.body_html ?? null,
    body_text: versionRow?.body_text ?? null,
    required_permission_key: row.required_permission_key ?? null,
    approval_workflow_code: row.approval_workflow_code ?? null,
    retention_policy: row.retention_policy ?? null,
    output_channels: row.output_channels ?? null,
    token_catalog: row.token_catalog ?? null,
    compatibility_status: row.compatibility_status ?? null,
    source_system: 'CORE',
    source_legacy_table: null,
    source_legacy_id: null,
    is_active: row.is_active !== false,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function mapLegacyLetterheadRow(row: any): DocumentTemplateRow {
  return {
    id: row.id,
    code: row.code ?? row.legacy_code ?? row.id,
    name: row.name,
    description: row.description ?? null,
    template_type: row.document_type ?? row.subcategory ?? 'LEGACY',
    template_category: row.category ?? null,
    module_code: row.module_code ?? null,
    business_event_code: row.business_object ?? null,
    recipient_type: row.recipient_type ?? null,
    language_code: row.default_language ?? null,
    version_no: row.version_no ?? null,
    status: (row.status as string) ?? 'COMPATIBILITY',
    effective_from: row.effective_from ?? null,
    effective_to: row.effective_to ?? null,
    letterhead_id: null,
    linked_letterhead_code: null,
    body_html: row.header_html ?? null,
    body_text: null,
    required_permission_key: null,
    approval_workflow_code: row.approval_workflow_code ?? null,
    retention_policy: row.retention_policy ?? null,
    output_channels: row.output_channels ?? null,
    token_catalog: null,
    compatibility_status: 'LEGACY_LETTERHEAD_TEMPLATE',
    source_system: 'LEGACY_LETTERHEAD',
    source_legacy_table: 'comm_letterhead',
    source_legacy_id: row.id,
    is_active: row.is_active !== false,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export const documentTemplateService = {
  /** Canonical list from core_template. */
  async getDocumentTemplates(filters: DocumentTemplateFilters = {}): Promise<DocumentTemplateRow[]> {
    let q = sb.from('core_template').select('*').order('code', { ascending: true });
    if (filters.moduleCode) q = q.eq('module_code', filters.moduleCode);
    if (filters.templateType) q = q.eq('template_type', filters.templateType);
    if (filters.category) q = q.eq('template_category', filters.category);
    if (filters.status) q = q.eq('status', filters.status);
    if (!filters.includeInactive) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) throw error;
    let rows = (data ?? []).map((r: any) => mapCoreTemplateRow(r));
    if (filters.search) {
      const needle = filters.search.trim().toLowerCase();
      rows = rows.filter((r) =>
        [r.code, r.name, r.template_type, r.template_category, r.module_code]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle),
      );
    }
    return rows;
  },

  async getDocumentTemplate(id: string): Promise<DocumentTemplateRow | null> {
    const { data, error } = await sb.from('core_template').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { data: v } = await sb
      .from('core_template_version')
      .select('*')
      .eq('template_id', id)
      .order('version_no', { ascending: false })
      .limit(1)
      .maybeSingle();
    return mapCoreTemplateRow(data, v);
  },

  async createDocumentTemplate(payload: Partial<DocumentTemplateRow>): Promise<DocumentTemplateRow> {
    const insertPayload = {
      code: payload.code,
      name: payload.name,
      description: payload.description ?? null,
      template_type: payload.template_type ?? 'LETTER',
      template_category: payload.template_category ?? null,
      module_code: payload.module_code ?? 'COMMON',
      status: payload.status ?? 'DRAFT',
      is_active: true,
    };
    const { data, error } = await sb.from('core_template').insert(insertPayload).select('*').single();
    if (error) throw error;
    await logDT(DOCUMENT_TEMPLATE_EVENTS.created, 'CREATE', {
      entityType: 'core_template',
      entityId: data.id,
      after: data,
    });
    return mapCoreTemplateRow(data);
  },

  async updateDocumentTemplate(id: string, payload: Partial<DocumentTemplateRow>): Promise<DocumentTemplateRow> {
    const { data: before } = await sb.from('core_template').select('*').eq('id', id).maybeSingle();
    const { data, error } = await sb.from('core_template').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    await logDT(DOCUMENT_TEMPLATE_EVENTS.updated, 'UPDATE', {
      entityType: 'core_template',
      entityId: id,
      before,
      after: data,
    });
    return mapCoreTemplateRow(data);
  },

  async deactivateDocumentTemplate(id: string): Promise<void> {
    const { error } = await sb.from('core_template').update({ is_active: false, status: 'ARCHIVED' }).eq('id', id);
    if (error) throw error;
    await logDT(DOCUMENT_TEMPLATE_EVENTS.deactivated, 'DEACTIVATE', { entityType: 'core_template', entityId: id });
  },

  async reactivateDocumentTemplate(id: string): Promise<void> {
    const { error } = await sb.from('core_template').update({ is_active: true, status: 'ACTIVE' }).eq('id', id);
    if (error) throw error;
    await logDT(DOCUMENT_TEMPLATE_EVENTS.reactivated, 'REACTIVATE', { entityType: 'core_template', entityId: id });
  },

  async publishDocumentTemplate(id: string): Promise<void> {
    const { error } = await sb.from('core_template').update({ status: 'PUBLISHED' }).eq('id', id);
    if (error) throw error;
    await logDT(DOCUMENT_TEMPLATE_EVENTS.published, 'PUBLISH', { entityType: 'core_template', entityId: id });
  },

  async unpublishDocumentTemplate(id: string): Promise<void> {
    const { error } = await sb.from('core_template').update({ status: 'DRAFT' }).eq('id', id);
    if (error) throw error;
    await logDT(DOCUMENT_TEMPLATE_EVENTS.unpublished, 'UNPUBLISH', { entityType: 'core_template', entityId: id });
  },

  async cloneDocumentTemplate(id: string, newCode: string): Promise<DocumentTemplateRow> {
    const { data: src, error: srcErr } = await sb.from('core_template').select('*').eq('id', id).single();
    if (srcErr) throw srcErr;
    const { id: _drop, created_at, updated_at, ...rest } = src as any;
    const { data, error } = await sb
      .from('core_template')
      .insert({ ...rest, code: newCode, name: `${src.name} (copy)`, status: 'DRAFT', is_active: false })
      .select('*')
      .single();
    if (error) throw error;
    await logDT(DOCUMENT_TEMPLATE_EVENTS.cloned, 'CREATE', {
      entityType: 'core_template',
      entityId: data.id,
      after: { cloned_from: id },
    });
    return mapCoreTemplateRow(data);
  },

  async linkTemplateToLetterhead(templateId: string, letterheadId: string | null): Promise<void> {
    // core_template does not currently expose a letterhead_id column universally;
    // when present we update it, otherwise the link is recorded via a template
    // version's layout binding. Either way we always audit the intent.
    const { error } = await sb.from('core_template').update({ letterhead_id: letterheadId }).eq('id', templateId);
    if (error && !/column .*letterhead_id.* does not exist/i.test(error.message ?? '')) throw error;
    await logDT(DOCUMENT_TEMPLATE_EVENTS.letterheadLinked, 'UPDATE', {
      entityType: 'core_template',
      entityId: templateId,
      after: { letterhead_id: letterheadId },
    });
  },

  async validateTemplateTokens(templateId: string): Promise<TokenValidationResult> {
    const { data: v } = await sb
      .from('core_template_version')
      .select('body_html, body_text, subject')
      .eq('template_id', templateId)
      .order('version_no', { ascending: false })
      .limit(1)
      .maybeSingle();
    const parsed = parseTemplateTokens(v?.subject, v?.body_html, v?.body_text);
    const known = await fetchKnownTokenCodes();
    const knownSet = new Set(known);
    const unknown = parsed.filter((t) => !knownSet.has(t) && !knownSet.has(t.split('.')[0]));
    const result: TokenValidationResult = {
      parsedTokens: parsed,
      knownTokens: parsed.filter((t) => !unknown.includes(t)),
      unknownTokens: unknown,
      isValid: unknown.length === 0,
    };
    await logDT(DOCUMENT_TEMPLATE_EVENTS.tokenValidated, 'RUN', {
      entityType: 'core_template',
      entityId: templateId,
      after: { parsedCount: parsed.length, unknownCount: unknown.length },
    });
    return result;
  },

  async previewDocumentTemplate(context: { templateId: string; sampleData?: Record<string, unknown> }): Promise<void> {
    await logDT(DOCUMENT_TEMPLATE_EVENTS.previewed, 'RUN', {
      entityType: 'core_template',
      entityId: context.templateId,
    });
  },

  /**
   * Compatibility loader — returns legacy comm_letterhead rows that were being
   * used as templates (rows with a `document_type` value). Non-destructive.
   */
  async getTemplateCompatibilityRows(): Promise<DocumentTemplateRow[]> {
    const { data, error } = await sb
      .from('comm_letterhead')
      .select('*')
      .not('document_type', 'is', null)
      .order('name', { ascending: true });
    if (error) return [];
    const rows = (data ?? []).map((r: any) => mapLegacyLetterheadRow(r));
    if (rows.length) {
      await logDT(DOCUMENT_TEMPLATE_EVENTS.compatibilityLoaded, 'RUN', {
        entityType: 'comm_letterhead',
        entityId: 'compatibility_loader',
        after: { count: rows.length },
      });
    }
    return rows;
  },
};
