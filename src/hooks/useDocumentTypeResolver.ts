import { useMemo } from 'react';
import { useVerifyTypes } from '@/hooks/useIPMasterLookups';

/**
 * Hook that returns a resolver function to map document type codes
 * to their tb_verify.description. Falls back to the original value
 * if no match is found in tb_verify.
 */
export function useDocumentTypeResolver() {
  const { data: verifyTypes = [] } = useVerifyTypes();

  const codeToDescription = useMemo(() => {
    const map = new Map<string, string>();
    for (const vt of verifyTypes) {
      if (vt.code && vt.description) {
        map.set(vt.code, vt.description);
      }
    }
    return map;
  }, [verifyTypes]);

  /** Resolve a document type code to its description, or return the original value */
  const resolveDocType = (typeCode: string | null | undefined): string => {
    if (!typeCode) return 'Unknown';
    return codeToDescription.get(typeCode) || typeCode;
  };

  return { resolveDocType };
}
