/**
 * Audit Plan Template Governance
 *
 * Provides governance rules, permission checks, cloning, versioning,
 * and default-selection logic for audit plan templates.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ GOVERNANCE MODEL                                                       │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. System templates (is_system=true) are read-only — users can clone  │
 * │    but never edit or delete them.                                      │
 * │ 2. Custom templates (is_system=false) support full CRUD by authorized │
 * │    users (audit_manager, admin).                                       │
 * │ 3. Exactly one template can be marked as the "house default"          │
 * │    (is_house_default=true). Setting a new default unsets the old one. │
 * │ 4. Templates have a lifecycle status: draft → published → archived.   │
 * │    Only published templates can be set as house default.              │
 * │ 5. Cloning a system template creates a custom copy with version=1.   │
 * │    Editing a custom template bumps its version number.                │
 * │ 6. All mutations are audit-logged via system_audit_trail.             │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import type { AuditPlanFullTemplateConfig } from './auditPlanTemplateTypes';

// ─── Lifecycle Status ───

export type TemplateStatus = 'draft' | 'published' | 'archived';

// ─── Extended Template Row (with governance fields) ───

export interface GovernedTemplateRow {
  id: string;
  template_name: string;
  template_key: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  is_house_default: boolean;
  status: TemplateStatus;
  version: number;
  cloned_from_id: string | null;
  cloned_from_name: string | null;
  config_json: AuditPlanFullTemplateConfig;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Permission Model ───

export type TemplateAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'clone'
  | 'delete'
  | 'publish'
  | 'archive'
  | 'set_default'
  | 'restore';

/**
 * Roles that can perform template governance actions.
 * Admin always has full access (handled at hook level via isAdmin).
 */
const ROLE_PERMISSIONS: Record<string, TemplateAction[]> = {
  audit_manager: ['view', 'create', 'edit', 'clone', 'delete', 'publish', 'archive', 'set_default', 'restore'],
  audit_officer: ['view', 'create', 'edit', 'clone'],
  auditor: ['view', 'clone'],
  compliance_reader: ['view'],
};

/**
 * Check if a role can perform a specific template action.
 */
export function canPerformTemplateAction(
  role: string | undefined,
  action: TemplateAction,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}

// ─── Guard Rules ───

export interface GovernanceViolation {
  allowed: false;
  reason: string;
}

export interface GovernanceAllowed {
  allowed: true;
}

export type GovernanceResult = GovernanceAllowed | GovernanceViolation;

/**
 * Check whether an action is allowed on a specific template.
 */
export function checkTemplateAction(
  template: GovernedTemplateRow,
  action: TemplateAction
): GovernanceResult {
  switch (action) {
    case 'view':
      return { allowed: true };

    case 'edit':
      if (template.is_system) {
        return { allowed: false, reason: 'System templates cannot be edited. Clone this template to create a customizable copy.' };
      }
      if (template.status === 'archived') {
        return { allowed: false, reason: 'Archived templates cannot be edited. Restore this template first.' };
      }
      return { allowed: true };

    case 'delete':
      if (template.is_system) {
        return { allowed: false, reason: 'System templates cannot be deleted.' };
      }
      if (template.is_house_default) {
        return { allowed: false, reason: 'The house default template cannot be deleted. Set another template as default first.' };
      }
      if (template.status === 'published') {
        return { allowed: false, reason: 'Published templates must be archived before deletion.' };
      }
      return { allowed: true };

    case 'clone':
      return { allowed: true };

    case 'publish':
      if (template.status === 'published') {
        return { allowed: false, reason: 'Template is already published.' };
      }
      if (template.status === 'archived') {
        return { allowed: false, reason: 'Archived templates must be restored before publishing.' };
      }
      return { allowed: true };

    case 'archive':
      if (template.is_house_default) {
        return { allowed: false, reason: 'The house default template cannot be archived. Set another template as default first.' };
      }
      if (template.status === 'archived') {
        return { allowed: false, reason: 'Template is already archived.' };
      }
      return { allowed: true };

    case 'set_default':
      if (template.status !== 'published') {
        return { allowed: false, reason: 'Only published templates can be set as the house default.' };
      }
      if (template.is_house_default) {
        return { allowed: false, reason: 'This template is already the house default.' };
      }
      return { allowed: true };

    case 'restore':
      if (template.status !== 'archived') {
        return { allowed: false, reason: 'Only archived templates can be restored.' };
      }
      return { allowed: true };

    case 'create':
      return { allowed: true };

    default:
      return { allowed: false, reason: 'Unknown action.' };
  }
}

// ─── Cloning ───

export interface CloneOptions {
  newName: string;
  newDescription?: string;
  clonedByUserCode: string;
}

/**
 * Build a new template row from a source template for cloning.
 * Returns the payload (without `id` — generated by DB).
 */
export function buildClonePayload(
  source: GovernedTemplateRow,
  options: CloneOptions
): Omit<GovernedTemplateRow, 'id' | 'created_at' | 'updated_at'> {
  const timestamp = new Date().toISOString();
  const sanitizedKey = options.newName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 50);

  return {
    template_name: options.newName,
    template_key: `custom_${sanitizedKey}_${Date.now().toString(36)}`,
    description: options.newDescription ?? `Cloned from "${source.template_name}"`,
    is_system: false,
    is_active: true,
    is_house_default: false,
    status: 'draft',
    version: 1,
    cloned_from_id: source.id,
    cloned_from_name: source.template_name,
    config_json: structuredClone(source.config_json),
    created_by: options.clonedByUserCode,
    updated_by: options.clonedByUserCode,
  };
}

// ─── Versioning ───

/**
 * Bump the version number of a template after an edit.
 */
export function bumpVersion(currentVersion: number): number {
  return currentVersion + 1;
}

/**
 * Generate a version label for display (e.g., "v3").
 */
export function formatVersionLabel(version: number): string {
  return `v${version}`;
}

// ─── Default Selection ───

/**
 * Resolve the effective template to use for plan generation.
 *
 * Priority:
 *   1. Explicitly selected template (if provided and published)
 *   2. House default template
 *   3. First published system template
 *   4. Audit Blue Minimal preset (hardcoded fallback)
 */
export function resolveEffectiveTemplate(
  templates: GovernedTemplateRow[],
  selectedTemplateId?: string | null
): GovernedTemplateRow | null {
  // 1. Explicit selection
  if (selectedTemplateId) {
    const selected = templates.find(
      (t) => t.id === selectedTemplateId && t.status === 'published' && t.is_active
    );
    if (selected) return selected;
  }

  // 2. House default
  const houseDefault = templates.find(
    (t) => t.is_house_default && t.status === 'published' && t.is_active
  );
  if (houseDefault) return houseDefault;

  // 3. First published system template
  const systemPublished = templates.find(
    (t) => t.is_system && t.status === 'published' && t.is_active
  );
  if (systemPublished) return systemPublished;

  // 4. Any published template
  return templates.find((t) => t.status === 'published' && t.is_active) ?? null;
}

// ─── Status Transitions ───

const VALID_TRANSITIONS: Record<TemplateStatus, TemplateStatus[]> = {
  draft: ['published'],
  published: ['archived'],
  archived: ['draft'], // restore goes back to draft
};

/**
 * Check if a status transition is valid.
 */
export function isValidStatusTransition(
  from: TemplateStatus,
  to: TemplateStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get the display label for a status.
 */
export function getStatusLabel(status: TemplateStatus): string {
  const labels: Record<TemplateStatus, string> = {
    draft: 'Draft',
    published: 'Published',
    archived: 'Archived',
  };
  return labels[status] ?? status;
}

/**
 * Get the badge variant for a status.
 */
export function getStatusBadgeVariant(
  status: TemplateStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'published':
      return 'default';
    case 'draft':
      return 'secondary';
    case 'archived':
      return 'outline';
    default:
      return 'secondary';
  }
}

// ─── Audit Logging Helpers ───

export interface TemplateAuditEntry {
  entity_type: 'ia_audit_plan_template';
  entity_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
}

export function buildAuditEntry(
  templateId: string,
  action: string,
  userCode: string,
  field?: string,
  oldVal?: string | null,
  newVal?: string | null
): TemplateAuditEntry {
  return {
    entity_type: 'ia_audit_plan_template',
    entity_id: templateId,
    action,
    field_name: field ?? null,
    old_value: oldVal ?? null,
    new_value: newVal ?? null,
    changed_by: userCode,
  };
}

// ─── Smart Defaults ───

/**
 * Returns the system template key that should be seeded as the house default.
 */
export const HOUSE_DEFAULT_TEMPLATE_KEY = 'audit_blue_minimal';

/**
 * Determine whether a template needs the "system protected" badge in UI.
 */
export function isProtected(template: GovernedTemplateRow): boolean {
  return template.is_system;
}

/**
 * Determine if a template is editable by the current user context.
 */
export function isEditable(template: GovernedTemplateRow): boolean {
  return !template.is_system && template.status !== 'archived';
}
