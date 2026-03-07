import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DocumentValidationResult {
  is_valid: boolean;
  confidence: number;
  reason: string;
  extracted_text_preview?: string;
}

interface ValidationState {
  validating: boolean;
  result: DocumentValidationResult | null;
}

/**
 * Hook for server-side document purpose validation.
 * Sends the uploaded file to the validate-document-purpose edge function
 * which uses AI to verify the document matches the selected type.
 */
export function useDocumentPurposeValidation() {
  const [validationStates, setValidationStates] = useState<Record<string, ValidationState>>({});

  const validateDocument = useCallback(async (
    file: File,
    docCode: string,
    slotKey: string,
    documentId?: string,
    userId?: string,
  ): Promise<DocumentValidationResult> => {
    setValidationStates(prev => ({
      ...prev,
      [slotKey]: { validating: true, result: null },
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('doc_code', docCode);
      formData.append('file_name', file.name);
      if (documentId) formData.append('document_id', documentId);
      if (userId) formData.append('user_id', userId);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-document-purpose`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error((errorBody as any)?.reason || `Validation failed: HTTP ${response.status}`);
      }

      const result: DocumentValidationResult = await response.json();

      setValidationStates(prev => ({
        ...prev,
        [slotKey]: { validating: false, result },
      }));

      return result;
    } catch (error: any) {
      console.error('Document purpose validation error:', error);
      const failResult: DocumentValidationResult = {
        is_valid: false,
        confidence: 0,
        reason: error.message || 'Validation service unavailable',
      };

      setValidationStates(prev => ({
        ...prev,
        [slotKey]: { validating: false, result: failResult },
      }));

      return failResult;
    }
  }, []);

  const clearValidation = useCallback((slotKey: string) => {
    setValidationStates(prev => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  }, []);

  const clearAllValidations = useCallback(() => {
    setValidationStates({});
  }, []);

  const isValidating = useCallback((slotKey: string) => {
    return validationStates[slotKey]?.validating || false;
  }, [validationStates]);

  const getValidationResult = useCallback((slotKey: string) => {
    return validationStates[slotKey]?.result || null;
  }, [validationStates]);

  return {
    validationStates,
    validateDocument,
    clearValidation,
    clearAllValidations,
    isValidating,
    getValidationResult,
  };
}
