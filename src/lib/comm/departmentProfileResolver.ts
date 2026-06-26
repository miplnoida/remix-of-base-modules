/**
 * Department Profile Resolver — public-facing entry point for all modules
 * (Legal, Benefits, Compliance, Finance, HR, Procurement, etc.).
 *
 * Returns the fully resolved communication context for a module, applying
 * the inheritance rules between core_organization defaults and
 * core_department_profile overrides.
 *
 *   inherit_*_from_org = true  → use organization default
 *   inherit_*_from_org = false → use the department override
 *
 * Templates and letter renderers should call this — never read raw
 * `core_department_profile.*_id` columns directly.
 */
export {
  resolveCommunicationContext as resolveDepartmentProfile,
  communicationTokens as departmentProfileTokens,
  applyCommunicationTokens as applyDepartmentProfileTokens,
  type CommunicationContext as DepartmentProfileContext,
} from "./communicationResolver";
