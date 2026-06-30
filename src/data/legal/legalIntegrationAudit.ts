/**
 * Legal × Enterprise Context Integration Audit catalogue.
 *
 * Curated, hand-maintained snapshot of where the Legal module currently sits
 * on the Enterprise Context Resolver journey. Used by the Organization →
 * Usage & Validation dashboard so admins can see at a glance:
 *
 *   - which Legal surfaces are now resolver-backed (OK / Info entries)
 *   - which surfaces still read core_organization / comm_* / app_modules
 *     directly (Error / Warning entries)
 *   - which surfaces still ship hardcoded organization / department / module
 *     names (Warning entries)
 *
 * Update this file whenever a Legal screen, service, document path, or DMS
 * helper is migrated to (or away from) `resolveEnterpriseContext()`.
 */

export type LegalAuditArea =
  | "Documents"
  | "Notifications"
  | "DMS"
  | "AI"
  | "Workbench"
  | "Templates";

export type LegalAuditSeverity = "error" | "warning" | "info";

export type LegalAuditStatus =
  | "INTEGRATED"           // uses resolveEnterpriseContext
  | "DIRECT_READ"          // still reads core_organization / comm_* / app_modules directly
  | "HARDCODED"            // ships hardcoded org / dept / module name or branding string
  | "DEPRECATED_TOKEN";    // template / asset references an unknown or deprecated token

export interface LegalAuditEntry {
  id: string;
  area: LegalAuditArea;
  severity: LegalAuditSeverity;
  status: LegalAuditStatus;
  title: string;
  path: string;               // file path or template code
  note: string;
}

export const LEGAL_AUDIT_ENTRIES: LegalAuditEntry[] = [
  // ---------------------- Documents (INTEGRATED) ----------------------
  {
    id: "doc-tmpl-ctx",
    area: "Documents",
    severity: "info",
    status: "INTEGRATED",
    title: "Legal template context service uses resolver",
    path: "src/services/legal/legalTemplateContextService.ts",
    note: "Reads org/dept/location/branding/letterhead/footer/disclaimer/email signature via resolveEnterpriseContext.",
  },
  {
    id: "doc-dispatcher",
    area: "Documents",
    severity: "info",
    status: "INTEGRATED",
    title: "Core template dispatcher injects enterprise tokens",
    path: "src/services/coreTemplateDispatcherService.ts",
    note: "Adds org.*, department.*, location.*, letterhead.*, print.footer, disclaimer.standard, email.* tokens; persists resolved_context snapshot.",
  },
  {
    id: "doc-print-lhead",
    area: "Documents",
    severity: "info",
    status: "INTEGRATED",
    title: "Legal letterhead component renders from resolver",
    path: "src/components/legal/LegalLetterhead.tsx",
    note: "Logo, address, footer, seal sourced from resolveEnterpriseContext output.",
  },

  // ---------------------- Notifications (INTEGRATED) ----------------------
  {
    id: "notif-referral-unified",
    area: "Notifications",
    severity: "info",
    status: "INTEGRATED",
    title: "Legal referral notifications use resolver branding",
    path: "src/services/legal/legalReferralUnifiedService.ts",
    note: "Sender, reply-to, signature, disclaimer come from resolver helpers (legalEnterpriseMetadata).",
  },
  {
    id: "notif-referral-collab",
    area: "Notifications",
    severity: "info",
    status: "INTEGRATED",
    title: "Info request / response notifications use resolver",
    path: "src/services/legal/legalReferralCollaborationService.ts",
    note: "templateData includes resolved enterprise branding tokens.",
  },
  {
    id: "notif-generate-notice",
    area: "Notifications",
    severity: "info",
    status: "INTEGRATED",
    title: "Generate Notice dialog stamps enterprise context",
    path: "src/components/legal/lg/GenerateNoticeDialog.tsx",
    note: "notification_queue entries carry resolved org/dept/module metadata.",
  },

  // ---------------------- DMS (INTEGRATED) ----------------------
  {
    id: "dms-link-service",
    area: "DMS",
    severity: "info",
    status: "INTEGRATED",
    title: "Legal DMS document link stamps enterprise metadata",
    path: "src/services/legal/lgDocumentLinkService.ts",
    note: "lg_document_link.enterprise_metadata populated from resolveLegalEnterprise().",
  },
  {
    id: "dms-source-doc",
    area: "DMS",
    severity: "info",
    status: "INTEGRATED",
    title: "Legal source document upload carries enterprise metadata",
    path: "src/services/legal/lgSourceDocumentService.ts",
    note: "Organization/department/module/location/case stamped on every DMS link.",
  },
  {
    id: "dms-case-create",
    area: "DMS",
    severity: "info",
    status: "INTEGRATED",
    title: "Case create wizard stamps enterprise context on intake files",
    path: "src/services/legal/lgCaseCreateService.ts",
    note: "All converted intake documents linked with enterprise_metadata.",
  },
  {
    id: "dms-core-service",
    area: "DMS",
    severity: "info",
    status: "INTEGRATED",
    title: "core-dms-upload propagates enterprise metadata",
    path: "supabase/functions/core-dms-upload/index.ts",
    note: "Edge function persists organization_id, department_code, module_code, location_id, confidentiality.",
  },

  // ---------------------- Workbench (INTEGRATED) ----------------------
  {
    id: "wb-unified",
    area: "Workbench",
    severity: "info",
    status: "INTEGRATED",
    title: "Legal Unified Workbench reads module/department from resolver",
    path: "src/pages/legal/LegalUnifiedWorkbench.tsx",
    note: "Title, subtitle, breadcrumb resolved via useLegalEnterpriseLabels.",
  },
  {
    id: "wb-matters",
    area: "Workbench",
    severity: "info",
    status: "INTEGRATED",
    title: "Legal Workbench (matters) uses resolver labels",
    path: "src/pages/legal/LegalWorkbench.tsx",
    note: "PageHeader title/subtitle resolved through useLegalEnterpriseLabels.",
  },
  {
    id: "wb-referrals",
    area: "Workbench",
    severity: "info",
    status: "INTEGRATED",
    title: "Legal Referrals Workbench title/queues use resolver labels",
    path: "src/workbenches/legal-referrals/LegalReferralsWorkbenchAdapter.tsx",
    note: 'Adapter accepts moduleName/departmentName overrides; "Waiting on Legal" label now dynamic.',
  },
  {
    id: "wb-advice",
    area: "Workbench",
    severity: "info",
    status: "INTEGRATED",
    title: "Advice & Contract Review screens use resolver labels",
    path: "src/pages/legal/contract-review/AdviceWorkbench.tsx",
    note: "Bucket titles/descriptions resolved through useLegalEnterpriseLabels.",
  },
  {
    id: "wb-cr-dashboard",
    area: "Workbench",
    severity: "info",
    status: "INTEGRATED",
    title: "Contract Review dashboard header uses resolver",
    path: "src/pages/legal/contract-review/ContractReviewDashboard.tsx",
    note: "Module + department name dynamic.",
  },

  // ---------------------- AI (INTEGRATED) ----------------------
  {
    id: "ai-context",
    area: "AI",
    severity: "info",
    status: "INTEGRATED",
    title: "Legal AI prompts inherit ai_context_notes via resolver",
    path: "src/lib/enterprise/enterpriseContextResolver.ts",
    note: "EnterpriseContext.ai_context surfaces module + department prompt prefix.",
  },

  // ---------------------- Templates (INTEGRATED) ----------------------
  {
    id: "tmpl-tokens",
    area: "Templates",
    severity: "info",
    status: "INTEGRATED",
    title: "Standardised enterprise tokens published for Legal templates",
    path: "src/services/coreTemplateDispatcherService.ts",
    note: "org.*, department.*, location.*, letterhead.*, print.footer, disclaimer.standard, email.*, branding.* available to all Legal templates.",
  },

  // ---------------------- Remaining DIRECT READS ----------------------
  {
    id: "direct-lg-dept-profile",
    area: "Documents",
    severity: "warning",
    status: "DIRECT_READ",
    title: "Legacy lg_department_profile reads still present",
    path: "src/services/legal/lgDepartmentProfileService.ts",
    note: "Used as fallback by communication resolver; safe but should be retired once Enterprise tables are fully populated.",
  },
  {
    id: "direct-letterhead-component",
    area: "Documents",
    severity: "warning",
    status: "DIRECT_READ",
    title: "Letterhead component still reads system_office_settings for legacy installs",
    path: "src/components/legal/LegalLetterhead.tsx",
    note: "Used only when resolveEnterpriseContext returns no organization; fallback path.",
  },
  {
    id: "direct-pdf-print",
    area: "Documents",
    severity: "warning",
    status: "DIRECT_READ",
    title: "Some PDF/print helpers still query comm_letterhead directly",
    path: "src/lib/receiptPrinter.ts, src/lib/invoicePrinter.ts",
    note: "Shared print helpers; Legal calls these via the resolver but the helpers themselves still query comm_* tables directly for non-Legal callers.",
  },

  // ---------------------- HARDCODED ----------------------
  {
    id: "hard-dispatcher-fallback",
    area: "Documents",
    severity: "warning",
    status: "HARDCODED",
    title: "Dispatcher carries SSB / Bay Road fallback strings",
    path: "src/services/coreTemplateDispatcherService.ts",
    note: 'inst = { name: "St. Christopher and Nevis Social Security Board", address: "Bay Road, Basseterre, St. Kitts", ... } used only if resolver fails.',
  },
  {
    id: "hard-legal-workbench-mock",
    area: "Workbench",
    severity: "warning",
    status: "HARDCODED",
    title: "Legal Workbench grid uses hardcoded SSB case numbers in mock data",
    path: "src/pages/legal/LegalWorkbench.tsx",
    note: 'mockSubcases array references "SSB/LGL/001/2024" etc. To be removed when wired to lg_case.',
  },
  {
    id: "hard-territory-labels",
    area: "Workbench",
    severity: "info",
    status: "HARDCODED",
    title: '"St Kitts" / "Nevis" territory filters are hardcoded',
    path: "src/pages/legal/LegalWorkbench.tsx, src/workbenches/legal-referrals/LegalReferralsWorkbenchAdapter.tsx",
    note: "Territory list should come from office_locations / region master once available.",
  },
];

/**
 * Token prefixes the dispatcher publishes. Anything outside this allowlist
 * found inside a Legal template body/subject is reported as a deprecated /
 * unknown token.
 */
export const KNOWN_TOKEN_PREFIXES = [
  "document.",
  "institution.",
  "org.",
  "department.",
  "location.",
  "letterhead.",
  "print.",
  "footer.",
  "disclaimer.",
  "email.",
  "branding.",
  "legal_reference.",
  "case.",
  "matter.",
  "party.",
  "notice.",
  "hearing.",
  "order.",
  "settlement.",
  "user.",
  "recipient.",
  "today",
  "now",
  "date",
] as const;

export function isKnownToken(name: string): boolean {
  return KNOWN_TOKEN_PREFIXES.some((p) =>
    p.endsWith(".") ? name.startsWith(p) : name === p,
  );
}
