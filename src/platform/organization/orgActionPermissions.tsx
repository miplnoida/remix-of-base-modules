/**
 * Epic OM-3.1 — Organisation Management action-level permission primitives.
 *
 * OM-2 seeded `core.admin.org.*` permission keys into core_permission_registry.
 * OM-3 wrapped pages with page-level PermissionWrapper.
 *
 * OM-3.1 adds:
 *   1. A canonical map of action → permission-key (view / manage / run / export).
 *   2. `useOrgAction` — reactive check for a specific OM action key.
 *   3. `<OrgActionGate>` — hides or disables an action button when denied.
 *   4. `assertOrgAction` — defensive runtime check for dangerous handlers.
 *
 * Because `core.admin.org.*` keys are NOT (yet) mapped into
 * `app_modules` / `module_actions` / `role_permissions`, non-admin users hold
 * NONE of these permissions today. Admins (via `useIsAdmin`) pass everything.
 * This is intentional and documented: "Do not grant manage access to normal
 * users" (see OM-3.1 acceptance criteria). The optional app_modules grant is
 * a deferred item — see completion report.
 */
import React from 'react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsAdmin } from '@/hooks/useNavigationMenu';
import { logOrgMutation } from './orgMutations';

/** Canonical OM-2 permission keys grouped by area. Read-only. */
export const ORG_PERMS = {
  profile: { view: 'core.admin.org.profile.view', manage: 'core.admin.org.profile.manage' },
  locations: { view: 'core.admin.org.locations.view', manage: 'core.admin.org.locations.manage' },
  departments: { view: 'core.admin.org.departments.view', manage: 'core.admin.org.departments.manage' },
  modules: { view: 'core.admin.org.modules.view', manage: 'core.admin.org.modules.manage' },
  designationHierarchy: {
    view: 'core.admin.org.designation_hierarchy.view',
    manage: 'core.admin.org.designation_hierarchy.manage',
  },
  media: { view: 'core.admin.org.media.view', manage: 'core.admin.org.media.manage' },
  letterheads: { view: 'core.admin.org.letterheads.view', manage: 'core.admin.org.letterheads.manage' },
  signatures: { view: 'core.admin.org.signatures.view', manage: 'core.admin.org.signatures.manage' },
  headersFooters: {
    view: 'core.admin.org.headers_footers.view',
    manage: 'core.admin.org.headers_footers.manage',
  },
  disclaimers: { view: 'core.admin.org.disclaimers.view', manage: 'core.admin.org.disclaimers.manage' },
  portalBranding: {
    view: 'core.admin.org.portal_branding.view',
    manage: 'core.admin.org.portal_branding.manage',
  },
  documentAssets: {
    view: 'core.admin.org.document_assets.view',
    manage: 'core.admin.org.document_assets.manage',
  },
  assetCategories: {
    view: 'core.admin.org.asset_categories.view',
    manage: 'core.admin.org.asset_categories.manage',
  },
  templates: { view: 'core.admin.org.templates.view', manage: 'core.admin.org.templates.manage' },
  notificationTemplates: {
    view: 'core.admin.org.notification_templates.view',
    manage: 'core.admin.org.notification_templates.manage',
  },
  textBlocks: { view: 'core.admin.org.text_blocks.view', manage: 'core.admin.org.text_blocks.manage' },
  tokens: { view: 'core.admin.org.tokens.view', manage: 'core.admin.org.tokens.manage' },
  channels: { view: 'core.admin.org.channels.view', manage: 'core.admin.org.channels.manage' },
  languages: { view: 'core.admin.org.languages.view', manage: 'core.admin.org.languages.manage' },
  configuration: {
    view: 'core.admin.org.configuration.view',
    manage: 'core.admin.org.configuration.manage',
  },
  validation: {
    view: 'core.admin.org.validation.view',
    run: 'core.admin.org.validation.run',
  },
  impact: { view: 'core.admin.org.impact.view' },
  brokenReferences: { view: 'core.admin.org.broken_references.view' },
  export: { action: 'core.admin.org.export' },
} as const;

export type OrgPermissionKey =
  | typeof ORG_PERMS.profile.view
  | typeof ORG_PERMS.profile.manage
  | typeof ORG_PERMS.locations.view
  | typeof ORG_PERMS.locations.manage
  | typeof ORG_PERMS.departments.view
  | typeof ORG_PERMS.departments.manage
  | typeof ORG_PERMS.modules.view
  | typeof ORG_PERMS.modules.manage
  | typeof ORG_PERMS.media.view
  | typeof ORG_PERMS.media.manage
  | typeof ORG_PERMS.letterheads.view
  | typeof ORG_PERMS.letterheads.manage
  | typeof ORG_PERMS.signatures.view
  | typeof ORG_PERMS.signatures.manage
  | typeof ORG_PERMS.headersFooters.view
  | typeof ORG_PERMS.headersFooters.manage
  | typeof ORG_PERMS.disclaimers.view
  | typeof ORG_PERMS.disclaimers.manage
  | typeof ORG_PERMS.portalBranding.view
  | typeof ORG_PERMS.portalBranding.manage
  | typeof ORG_PERMS.documentAssets.view
  | typeof ORG_PERMS.documentAssets.manage
  | typeof ORG_PERMS.assetCategories.view
  | typeof ORG_PERMS.assetCategories.manage
  | typeof ORG_PERMS.templates.view
  | typeof ORG_PERMS.templates.manage
  | typeof ORG_PERMS.notificationTemplates.view
  | typeof ORG_PERMS.notificationTemplates.manage
  | typeof ORG_PERMS.textBlocks.view
  | typeof ORG_PERMS.textBlocks.manage
  | typeof ORG_PERMS.tokens.view
  | typeof ORG_PERMS.tokens.manage
  | typeof ORG_PERMS.channels.view
  | typeof ORG_PERMS.channels.manage
  | typeof ORG_PERMS.languages.view
  | typeof ORG_PERMS.languages.manage
  | typeof ORG_PERMS.configuration.view
  | typeof ORG_PERMS.configuration.manage
  | typeof ORG_PERMS.validation.view
  | typeof ORG_PERMS.validation.run
  | typeof ORG_PERMS.impact.view
  | typeof ORG_PERMS.brokenReferences.view
  | typeof ORG_PERMS.export.action;

/**
 * Runtime check for a specific OM action permission.
 *
 * Today: admins pass, everyone else is denied for `manage`/`run`/`export`
 * keys because the OM-2 keys are not mapped into role_permissions. Governance
 * intent is preserved: dangerous OM mutations remain admin-only until the
 * app_modules grant epic is executed.
 */
export function useOrgAction(key: OrgPermissionKey): { allowed: boolean; isAdmin: boolean } {
  const isAdmin = useIsAdmin();
  // View keys are permissive for authenticated admins today; the page-level
  // PermissionWrapper handles unauthenticated / access-denied paths.
  return { allowed: isAdmin, isAdmin };
}

interface OrgActionGateProps {
  permission: OrgPermissionKey;
  children: React.ReactElement;
  /** When true, keeps the element mounted but disabled with a tooltip. */
  disableInsteadOfHide?: boolean;
  /** Optional custom tooltip when disabled. */
  tooltip?: string;
}

/**
 * Hides (or disables) an action button/control when the current user lacks
 * the required OM action permission. Use for create/edit/publish/upload/save
 * /archive/run/export buttons.
 */
export function OrgActionGate({
  permission,
  children,
  disableInsteadOfHide = false,
  tooltip,
}: OrgActionGateProps) {
  const { allowed } = useOrgAction(permission);
  if (allowed) return children;
  if (!disableInsteadOfHide) return null;
  const disabledMsg = tooltip ?? 'You do not have permission for this action.';
  const cloned = React.cloneElement(children, { disabled: true, title: disabledMsg } as any);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block cursor-not-allowed">{cloned}</span>
        </TooltipTrigger>
        <TooltipContent>{disabledMsg}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Defensive runtime guard for dangerous handlers. Call at the top of a
 * mutation handler; if the user is not allowed, shows a toast, audits a
 * `DENIED` attempt for high-risk actions, and throws so the caller aborts.
 *
 * Because `useOrgAction` is a hook, callers pass the `allowed` boolean
 * captured at render time.
 */
export function assertOrgAction(args: {
  allowed: boolean;
  permission: OrgPermissionKey;
  actionLabel: string;
  /** When set, also writes a `DENIED` audit entry with this event code. */
  auditEventCode?: string;
  entityType?: string;
  entityId?: string | null;
  entityDisplayName?: string | null;
}): void {
  if (args.allowed) return;
  const msg = `You do not have permission to ${args.actionLabel}.`;
  toast.error(msg);
  if (args.auditEventCode) {
    void logOrgMutation({
      eventCode: args.auditEventCode,
      kind: 'DELETE_ATTEMPT',
      entityType: args.entityType ?? 'organization',
      entityId: args.entityId ?? null,
      entityDisplayName: args.entityDisplayName ?? null,
      outcome: 'DENIED',
      reason: `Missing permission: ${args.permission}`,
      metadata: { permission: args.permission, action: args.actionLabel },
    });
  }
  throw new Error(msg);
}
