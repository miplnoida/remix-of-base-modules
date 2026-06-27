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
export * from "./types";
