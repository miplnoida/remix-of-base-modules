/**
 * Public surface of the Enterprise Communication Framework.
 *
 * Modules MUST import from `@/lib/enterprise` only. Direct imports from
 * `@/lib/comm/*`, `@/integrations/supabase/client` for comm tables, or
 * any `comm_*` / `core_template` / `core_text_block` table are
 * disallowed in module code (Legal, Benefits, Compliance, Finance, HR,
 * Registration, Employer Services).
 */

export { resolveCommunication } from "./CommunicationResolver";
export { generateDocument } from "./DocumentGenerationResolver";
export { resolveNotification } from "./NotificationResolver";
export type {
  NotificationRequest,
  ResolvedNotification,
  NotificationChannel,
} from "./NotificationResolver";
export { resolvePortalBranding } from "./PortalBrandingResolver";
export type { PortalBranding } from "./PortalBrandingResolver";
export { resolveFinancialDoc } from "./ReceiptResolver";
export type {
  FinancialDocKind,
  FinancialLayout,
  ResolvedFinancialDoc,
} from "./ReceiptResolver";
export { runHealthChecks } from "./healthChecks";
export type { HealthFinding, HealthSeverity } from "./healthChecks";
export {
  expandTextBlockTokens,
  extractTextBlockCodes,
} from "./textBlockTokenizer";
export * from "./types";
