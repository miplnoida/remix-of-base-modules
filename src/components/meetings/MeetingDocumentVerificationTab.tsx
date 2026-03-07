import React, { useState, useEffect, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import { FileCheck, Upload, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import { useDocumentVerification } from '@/hooks/useDocumentVerification';
import {
  UnifiedDocument, VerificationCategory, DocumentPersistenceAdapter, DocTypeMismatch,
  CATEGORY_TO_VERIFY_TYPE, VERIFY_TYPE_TO_CATEGORY,
  mapExternalDocs, mapPlatformDocs, mergeDocuments,
  resolveExternalDocTypeToCode,
} from '@/components/documents/shared/types';
import { DocumentPreviewDialog } from '@/components/documents/shared/DocumentPreviewDialog';
import { DocumentSelectionStep } from '@/components/documents/shared/DocumentSelectionStep';
import { DocumentUploadStep } from '@/components/documents/shared/DocumentUploadStep';

export { type DocTypeMismatch } from '@/components/documents/shared/types';

export interface MeetingDocumentVerificationTabHandle {
  validateDocTypeMismatch: () => DocTypeMismatch[];
}

interface MeetingDocumentVerificationTabProps {
  applicationData: Record<string, any>;
  meetingId: string;
  applicationReference: string;
  isEditable: boolean;
  onReplacedCategoriesChange?: (replacedCategories: Set<string>) => void;
}

// --- Meeting Adapter ---
function createMeetingAdapter(
  meetingId: string,
  applicationReference: string,
  externalApiDocs: any[],
): DocumentPersistenceAdapter {
  return {
    async fetchDocuments(): Promise<UnifiedDocument[]> {
      const externalDocs = mapExternalDocs(externalApiDocs || []);
      const { data: platformRows, error } = await supabase
        .from('meeting_uploaded_documents')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('application_reference', applicationReference)
        .order('created_at', { ascending: false });
      if (error) console.error('Error fetching platform documents:', error);
      const platformDocs = mapPlatformDocs(platformRows || []);
      return mergeDocuments(externalDocs, platformDocs);
    },

    async uploadFile(file: File, storagePath: string): Promise<string> {
      const fileExt = file.name.split('.').pop();
      const fileName = `meeting_${meetingId}/${storagePath.split('_')[1]}_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('ip-documents').upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('ip-documents').getPublicUrl(fileName);
      (this as any)._lastUploadPath = fileName;
      return urlData?.publicUrl || '';
    },

    async insertRecord(params: any): Promise<void> {
      const { slot, file, publicUrl, userId, userCode } = params;
      const filePath = (this as any)._lastUploadPath || '';
      const { error } = await supabase.from('meeting_uploaded_documents').insert({
        meeting_id: meetingId,
        application_reference: applicationReference,
        document_type: slot.isSupportive ? 'supportive' : 'mandatory',
        document_name: slot.docDescription,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        storage_url: publicUrl,
        verification_category: slot.categoryId,
        is_supportive: slot.isSupportive,
        supportive_doc_type: slot.isSupportive ? slot.docCode : null,
        doc_code: slot.docCode,
        is_active: true,
        uploaded_by: userId,
        uploaded_by_code: userCode || null,
        metadata: {
          meeting_id: meetingId,
          application_reference: applicationReference,
          verification_type: CATEGORY_TO_VERIFY_TYPE[slot.categoryId] || null,
          doc_code: slot.docCode,
        },
      });
      if (error) throw error;
    },

    async deactivateByCategory(categoryId: string, isSupportive: boolean): Promise<void> {
      const { error } = await supabase
        .from('meeting_uploaded_documents')
        .update({ is_active: false, replaced_at: new Date().toISOString() } as any)
        .eq('meeting_id', meetingId)
        .eq('application_reference', applicationReference)
        .eq('verification_category', categoryId)
        .eq('is_supportive', isSupportive)
        .eq('is_active', true);
      if (error) console.error('Failed to deactivate documents:', error);
    },

    async deleteDocument(doc: UnifiedDocument): Promise<void> {
      if (doc.source === 'external') throw new Error('Cannot delete external documents');
      if (doc.file_path) await supabase.storage.from('ip-documents').remove([doc.file_path]);
      const { error } = await supabase.from('meeting_uploaded_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },

    async downloadFile(filePath: string): Promise<Blob> {
      const { data, error } = await supabase.storage.from('ip-documents').download(filePath);
      if (error) throw error;
      return data;
    },
  };
}

export const MeetingDocumentVerificationTab = forwardRef<MeetingDocumentVerificationTabHandle, MeetingDocumentVerificationTabProps>(
  function MeetingDocumentVerificationTab({ applicationData, meetingId, applicationReference, isEditable, onReplacedCategoriesChange }, ref) {
    const { user } = useAuth();
    const { userCode } = useUserCode();

    const maritalStatus = applicationData?.maritalStatus || '';
    const isMarried = ['Married', 'M', 'Common Law', 'C'].includes(maritalStatus);
    const hasDeathInfo = useMemo(() => {
      const deps = applicationData?.dependants || [];
      return deps.some((d: any) => !!d.dateOfDeath);
    }, [applicationData?.dependants]);

    const verificationCategories = useMemo((): VerificationCategory[] => [
      { id: 'birth', label: 'Birth Status Verification', fieldKey: 'birth_doc_type', isMandatory: true, tooltip: 'Select the document that verifies the applicant\'s birth.' },
      { id: 'name', label: 'Name Status Verification', fieldKey: 'name_doc_type', isMandatory: true, tooltip: 'Select the document that verifies the applicant\'s legal name.' },
      { id: 'marital', label: 'Marital Status Verification', fieldKey: 'marital_doc_type', isMandatory: isMarried, tooltip: isMarried ? 'Marriage Certificate is required.' : 'Optional.', autoSelectCode: isMarried ? 'M' : undefined },
      { id: 'death', label: 'Death Status Verification', fieldKey: 'death_doc_type', isMandatory: hasDeathInfo, tooltip: hasDeathInfo ? 'Certificate of Death is required.' : 'Optional.', autoSelectCode: hasDeathInfo ? 'C' : undefined },
    ], [isMarried, hasDeathInfo]);

    // External API doc field keys
    const externalDocFieldKeys = useMemo(() => {
      const map: Record<string, string> = {};
      const verTypeToFieldKey: Record<string, string> = { birth_status: 'birth_doc_type', name_status: 'name_doc_type', marital_status: 'marital_doc_type', death_status: 'death_doc_type' };
      const apiDocs = applicationData?.documents;
      if (apiDocs && Array.isArray(apiDocs)) {
        for (const doc of apiDocs) {
          const vt = doc.verificationType as string | undefined;
          const dt = doc.documentType as string | undefined;
          if (vt && dt && verTypeToFieldKey[vt]) {
            const resolvedCode = resolveExternalDocTypeToCode(dt);
            if (resolvedCode) map[verTypeToFieldKey[vt]] = resolvedCode;
          }
        }
      }
      return map;
    }, [applicationData?.documents]);

    const adapter = useMemo(() => createMeetingAdapter(meetingId, applicationReference, applicationData?.documents || []), [meetingId, applicationReference, applicationData?.documents]);

    const hook = useDocumentVerification({
      adapter,
      verificationCategories,
      externalDocFieldKeys,
      userId: user?.id,
      userCode: userCode || undefined,
    });

    // Report replaced categories to parent
    useEffect(() => {
      if (!onReplacedCategoriesChange) return;
      const platformCategories = new Set<string>();
      for (const doc of hook.activeDocuments) {
        if (doc.source === 'platform' && doc.verification_category) platformCategories.add(doc.verification_category);
      }
      onReplacedCategoriesChange(platformCategories);
    }, [hook.activeDocuments, onReplacedCategoriesChange]);

    // Expose mismatch validation via ref
    const [docTypeMismatchErrors, setDocTypeMismatchErrors] = useState<DocTypeMismatch[]>([]);
    useImperativeHandle(ref, () => ({
      validateDocTypeMismatch: () => {
        const mismatches = hook.validateDocTypeMismatch();
        setDocTypeMismatchErrors(mismatches);
        return mismatches;
      },
    }), [hook.validateDocTypeMismatch]);

    const legacyPlatformDocs = hook.activeDocuments.filter(d => !d.verification_category && d.source === 'platform');
    const externalUncategorizedDocs = hook.activeDocuments.filter(d => !d.verification_category && d.source === 'external');

    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Doc-type mismatch validation banner */}
          {docTypeMismatchErrors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-destructive font-medium">
                <AlertTriangle className="h-5 w-5" />
                Document Type Mismatch — Cannot Accept
              </div>
              <ul className="list-disc list-inside text-sm text-destructive space-y-1">
                {docTypeMismatchErrors.map((m, i) => (
                  <li key={i}>
                    <strong>{m.categoryLabel}:</strong> Dropdown is set to <em>{m.selectedType}</em> but the uploaded document is <em>{m.documentType}</em>. Please update the dropdown or re-upload the correct document.
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                hook.currentStep === 'selection' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              onClick={() => hook.setCurrentStep('selection')}
            >
              <FileCheck className="h-4 w-4" />
              1. Document Selection
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                hook.currentStep === 'upload' ? 'bg-primary text-primary-foreground'
                  : hook.canProceedToUpload ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                  : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
              }`}
              onClick={() => { if (hook.canProceedToUpload) hook.setCurrentStep('upload'); }}
            >
              <Upload className="h-4 w-4" />
              2. Upload Documents
            </div>
          </div>

          {/* STEP 1 */}
          {hook.currentStep === 'selection' && (
            <DocumentSelectionStep
              verificationCategories={verificationCategories}
              verifySelections={hook.verifySelections}
              supportiveSelections={hook.supportiveSelections}
              selectionErrors={hook.selectionErrors}
              verifyTypes={hook.verifyTypes}
              verifyLoading={hook.verifyLoading}
              isEditable={isEditable}
              canProceedToUpload={hook.canProceedToUpload}
              documents={hook.documents}
              pendingReupload={hook.pendingReupload}
              externalDocFieldKeys={externalDocFieldKeys}
              platformOverrides={hook.platformOverrides}
              onVerificationChange={hook.handleVerificationChange}
              onSupportiveChange={(catId, code) => hook.setSupportiveSelections(prev => ({ ...prev, [catId]: code }))}
              onProceedToUpload={() => hook.setCurrentStep('upload')}
            />
          )}

          {/* STEP 2 */}
          {hook.currentStep === 'upload' && (
            <DocumentUploadStep
              uploadSlots={hook.uploadSlots}
              uploading={hook.uploading}
              uploadProgress={hook.uploadProgress}
              uploadErrors={hook.uploadErrors}
              isEditable={isEditable}
              verificationCategories={verificationCategories}
              docTypeMismatchErrors={docTypeMismatchErrors}
              purposeValidationStates={hook.purposeValidation.validationStates}
              onFileUpload={hook.handleFileUpload}
              onDelete={hook.handleDeleteDocument}
              onDownload={hook.handleDownloadDocument}
              onView={hook.handleViewDocument}
              onBackToSelection={() => hook.setCurrentStep('selection')}
              getDocsForSlot={hook.getDocsForSlot}
              legacyDocs={legacyPlatformDocs}
              externalUncategorizedDocs={externalUncategorizedDocs}
            />
          )}

          <DocumentPreviewDialog open={hook.previewOpen} previewDoc={hook.previewDoc} onClose={hook.handleClosePreview} />
        </div>
      </TooltipProvider>
    );
  }
);
