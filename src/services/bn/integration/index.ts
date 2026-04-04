/**
 * BN Integration — Central barrel export
 * 
 * All platform integration goes through this single entry point.
 * When migrating from Supabase to ASP.NET APIs, swap adapter implementations here.
 */

// Contracts (interfaces)
export type {
  IBnPersonAdapter,
  IBnContributionAdapter,
  IBnEmployerAdapter,
  IBnPaymentAdapter,
  IBnNotificationAdapter,
  IBnDocumentAdapter,
  IBnWorkflowAdapter,
  IBnAuditAdapter,
  PersonSummary,
  AddressRecord,
  Dependant,
  ContributionSummary,
  WageRecord,
  EmployerSummary,
  EmploymentVerification,
  PaymentInstruction,
  PaymentResult,
  PaymentStatus,
  BnNotificationType,
  BnNotificationRequest,
  DocumentRef,
  DocumentUploadRequest,
  WorkflowStartRequest,
  WorkflowState,
} from './contracts';

// Adapter implementations
export { bnPersonAdapter } from './personAdapter';
export { bnContributionAdapter } from './contributionAdapter';
export { bnEmployerAdapter } from './employerAdapter';
export { bnPaymentAdapter } from './paymentAdapter';
export { bnNotificationAdapter } from './notificationAdapter';
export { bnDocumentAdapter } from './documentAdapter';
export { bnWorkflowAdapter } from './workflowAdapter';

// Event bus
export {
  publishBnEvent,
  subscribeToBnEvents,
  pollBnEvents,
  markEventsConsumed,
} from './eventBus';
export type { BnEventType, BnEvent } from './eventBus';
