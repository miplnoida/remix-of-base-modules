/**
 * @deprecated Re-export shim. Use `@/services/legal-reference/legalReferenceService` directly.
 * The BN-specific Legal Reference service has been merged into the shared
 * module-agnostic implementation under src/services/legal-reference/.
 */
export {
  listLegalReferences,
  getLegalReference,
  upsertLegalReference,
  deleteLegalReference,
  setLegalReferenceStatus,
} from '@/services/legal-reference/legalReferenceService';
export type {
  LegalRefStatus,
  LegalReference as BnLegalReference,
} from '@/services/legal-reference/types';
