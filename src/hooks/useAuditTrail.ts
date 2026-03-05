import { useUserCode } from '@/hooks/useUserCode';

/**
 * Hook to get audit trail fields (created_by / updated_by) for IA mutations.
 */
export function useAuditFields() {
  const { userCode } = useUserCode();

  const getCreateFields = () => ({
    created_by: userCode || 'SYSTEM',
    updated_by: userCode || 'SYSTEM',
  });

  const getUpdateFields = () => ({
    updated_by: userCode || 'SYSTEM',
    updated_at: new Date().toISOString(),
  });

  return { getCreateFields, getUpdateFields, userCode };
}
