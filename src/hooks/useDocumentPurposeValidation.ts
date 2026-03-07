import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logApplicationError } from '@/lib/globalErrorHandler';

export interface DocumentValidationResult {
  is_valid: boolean;
  confidence: number;
  reason: string;
  extracted_text_preview?: string;
  user_message?: string;
  _fallback?: boolean;
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

      let result: DocumentValidationResult;

      if (!response.ok) {
        // Try to parse error body
        let errorBody: any = {};
        try {
          errorBody = await response.json();
        } catch {
          // ignore parse error
        }

        // Log the full technical error for debugging
        await logApplicationError(
          new Error(`Document validation HTTP ${response.status}: ${errorBody?.reason || 'Unknown'}`),
          {
            module: 'DocumentPurposeValidation',
            action: 'validateDocument',
            entity_type: 'document',
            request_payload: { docCode, fileName: file.name, fileSize: file.size, mimeType: file.type },
          }
        );

        // If the server returned a structured response with user_message, use it
        if (errorBody?.user_message) {
          result = {
            is_valid: errorBody.is_valid ?? false,
            confidence: errorBody.confidence ?? 0,
            reason: errorBody.reason || 'Validation service error',
            user_message: errorBody.user_message,
          };
        } else {
          // Service unavailable — accept document gracefully
          result = {
            is_valid: true,
            confidence: 0.5,
            reason: `Validation service returned HTTP ${response.status}`,
            user_message: 'Document accepted. Automatic verification was temporarily unavailable — your document will be reviewed manually.',
            _fallback: true,
          };
        }
      } else {
        result = await response.json();
      }

      setValidationStates(prev => ({
        ...prev,
        [slotKey]: { validating: false, result },
      }));

      return result;
    } catch (error: any) {
      // Log full technical error for support/debugging
      console.error('Document purpose validation error:', error);
      await logApplicationError(error, {
        module: 'DocumentPurposeValidation',
        action: 'validateDocument',
        entity_type: 'document',
        request_payload: { docCode, fileName: file.name, fileSize: file.size, mimeType: file.type },
      });

      // Don't block the user — accept with fallback
      const fallbackResult: DocumentValidationResult = {
        is_valid: true,
        confidence: 0.5,
        reason: error.message || 'Validation service unavailable',
        user_message: 'Document accepted. Automatic verification could not be completed at this time — your document will be reviewed manually.',
        _fallback: true,
      };

      setValidationStates(prev => ({
        ...prev,
        [slotKey]: { validating: false, result: fallbackResult },
      }));

      return fallbackResult;
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
