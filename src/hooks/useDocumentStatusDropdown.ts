import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Maps verification_type to the corresponding status column name on ip_application_documents.
 */
const VERIFICATION_TYPE_TO_COLUMN: Record<string, string> = {
  birth_status: 'birth_status',
  name_status: 'name_status',
  marital_status: 'marital_status',
  death_status: 'death_status',
};

export interface DocWithStatus {
  id: string;
  verification_type?: string | null;
  birth_status?: string | null;
  name_status?: string | null;
  marital_status?: string | null;
  death_status?: string | null;
  [key: string]: any;
}

/**
 * Hook to manage per-document status dropdown state and persistence.
 * Each dropdown is keyed by document id, ensuring independent state per row.
 */
export function useDocumentStatusDropdown(docs: DocWithStatus[]) {
  // Local state: map of doc.id -> current status value
  const [statusValues, setStatusValues] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Initialize/sync local state from loaded docs
  useEffect(() => {
    const initial: Record<string, string | undefined> = {};
    for (const doc of docs) {
      const vt = doc.verification_type;
      if (vt && VERIFICATION_TYPE_TO_COLUMN[vt]) {
        const col = VERIFICATION_TYPE_TO_COLUMN[vt];
        const savedValue = doc[col] as string | null | undefined;
        initial[doc.id] = savedValue || undefined;
      }
    }
    setStatusValues(initial);
  }, [docs]);

  /**
   * Get the current dropdown value for a document.
   */
  const getStatusValue = useCallback((docId: string): string | undefined => {
    return statusValues[docId];
  }, [statusValues]);

  /**
   * Get the column name for a document's verification_type.
   */
  const getStatusColumn = useCallback((verType: string | null | undefined): string | null => {
    if (!verType) return null;
    return VERIFICATION_TYPE_TO_COLUMN[verType] || null;
  }, []);

  /**
   * Check if a document has a status dropdown (has a valid verification_type).
   */
  const hasStatusDropdown = useCallback((doc: DocWithStatus): boolean => {
    return !!(doc.verification_type && VERIFICATION_TYPE_TO_COLUMN[doc.verification_type]);
  }, []);

  /**
   * Handle status change: update local state and persist to Supabase.
   */
  const handleStatusChange = useCallback(async (docId: string, verType: string, newValue: string) => {
    const col = VERIFICATION_TYPE_TO_COLUMN[verType];
    if (!col) return;

    // Optimistic update
    setStatusValues(prev => ({ ...prev, [docId]: newValue }));
    setSaving(prev => ({ ...prev, [docId]: true }));

    try {
      const { error } = await supabase
        .from('ip_application_documents')
        .update({ [col]: newValue } as any)
        .eq('id', docId);

      if (error) throw error;
      toast.success('Status updated');
    } catch (err: any) {
      console.error('Failed to update document status:', err);
      toast.error('Failed to update status', { description: err.message });
      // Revert on failure
      const doc = docs.find(d => d.id === docId);
      const originalValue = doc?.[col] as string | undefined;
      setStatusValues(prev => ({ ...prev, [docId]: originalValue }));
    } finally {
      setSaving(prev => ({ ...prev, [docId]: false }));
    }
  }, [docs]);

  /**
   * Get the display label for a verification_type.
   */
  const getStatusLabel = useCallback((verType: string | null | undefined): string => {
    switch (verType) {
      case 'birth_status': return 'Birth Status';
      case 'name_status': return 'Name Status';
      case 'marital_status': return 'Marital Status';
      case 'death_status': return 'Death Status';
      default: return '';
    }
  }, []);

  return {
    getStatusValue,
    getStatusColumn,
    hasStatusDropdown,
    handleStatusChange,
    getStatusLabel,
    isSaving: saving,
  };
}
