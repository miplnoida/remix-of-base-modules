/**
 * OM-5 — canonical document-template concept types.
 *
 * These types describe the platform-facing Document Template shape. The
 * physical storage is `core_template` (+ `core_template_version` for bodies,
 * `core_template_layout` for layouts). Letterheads live in `comm_letterhead`
 * and represent layout/branding shells only.
 */

export type DocumentTemplateStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'DEPRECATED'
  | 'COMPATIBILITY';

export type DocumentTemplateSource = 'CORE' | 'LEGACY_LETTERHEAD';

export interface DocumentTemplateRow {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  template_type: string;
  template_category?: string | null;
  module_code?: string | null;
  business_event_code?: string | null;
  recipient_type?: string | null;
  language_code?: string | null;
  version_no?: number | null;
  status: DocumentTemplateStatus | string;
  effective_from?: string | null;
  effective_to?: string | null;
  letterhead_id?: string | null;
  linked_letterhead_code?: string | null;
  body_html?: string | null;
  body_text?: string | null;
  required_permission_key?: string | null;
  approval_workflow_code?: string | null;
  retention_policy?: string | null;
  output_channels?: string[] | null;
  token_catalog?: unknown;
  compatibility_status?: string | null;
  source_system: DocumentTemplateSource;
  source_legacy_table?: string | null;
  source_legacy_id?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DocumentTemplateFilters {
  moduleCode?: string;
  templateType?: string;
  category?: string;
  status?: string;
  search?: string;
  includeInactive?: boolean;
}

export interface TokenValidationResult {
  parsedTokens: string[];
  knownTokens: string[];
  unknownTokens: string[];
  isValid: boolean;
}
