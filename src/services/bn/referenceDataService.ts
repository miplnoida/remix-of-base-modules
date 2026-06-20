/**
 * DEPRECATED — re-exports the central coreReferenceDataService.
 *
 * Reference data is now hosted by `core_reference_group` / `core_reference_value`
 * and shared across Benefits, Legal, Compliance, Country Pack, Payments, etc.
 * New code should import from `@/services/core/coreReferenceDataService`.
 *
 * This shim keeps existing imports compiling during the transition.
 */
export * from '@/services/core/coreReferenceDataService';
