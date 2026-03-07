import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVerifyTypes } from '@/hooks/useIPMasterLookups';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import React from 'react';
import {
  UnifiedDocument, VerificationCategory, UploadSlot, PreviewDoc, DocTypeMismatch,
  DocumentPersistenceAdapter,
  CODES_REQUIRING_SUPPORTIVE, SUPPORTIVE_DOC_CODES,
  MAX_FILE_SIZE, ACCEPTED_MIME_TYPES,
  CATEGORY_FIELD_KEY_MAP,
  getFileCategory,
} from '@/components/documents/shared/types';
import { useDocumentPurposeValidation, type DocumentValidationResult } from '@/hooks/useDocumentPurposeValidation';

export interface UseDocumentVerificationConfig {
  adapter: DocumentPersistenceAdapter;
  verificationCategories: VerificationCategory[];
  /** External API doc field keys (fieldKey → verify code) */
  externalDocFieldKeys?: Record<string, string>;
  /** Callback when a verify selection changes */
  onSelectionChange?: (fieldKey: string, code: string) => void;
  /** Callback after a document upload completes successfully */
  onUploadComplete?: () => void;
  userId?: string;
  userCode?: string;
}

export function useDocumentVerification(config: UseDocumentVerificationConfig) {
  const { adapter, verificationCategories, externalDocFieldKeys = {}, onSelectionChange, onUploadComplete, userId, userCode } = config;
  const { data: verifyTypes = [], isLoading: verifyLoading } = useVerifyTypes();

  // --- State ---
  const [verifySelections, setVerifySelections] = useState<Record<string, string>>({});
  const [supportiveSelections, setSupportiveSelections] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<UnifiedDocument[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<'selection' | 'upload'>('selection');
  const [pendingReupload, setPendingReupload] = useState<Record<string, string>>({});
  const [platformOverrides, setPlatformOverrides] = useState<Record<string, string>>({});

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);

  // Track user-initiated selections (highest priority)
  const userSelectionsRef = useRef<Record<string, string>>({});
  const prevSelectionsRef = useRef<Record<string, string>>({});

  // --- Active documents ---
  const activeDocuments = useMemo(() => documents.filter(d => d.is_active !== false), [documents]);

  // --- Auto-select from external API + platform overrides + user selections ---
  useEffect(() => {
    if (Object.keys(externalDocFieldKeys).length === 0 && Object.keys(platformOverrides).length === 0) return;
    setVerifySelections(prev => {
      const next = { ...prev };
      for (const [fieldKey, code] of Object.entries(externalDocFieldKeys)) {
        next[fieldKey] = code;
      }
      for (const [fieldKey, code] of Object.entries(platformOverrides)) {
        next[fieldKey] = code;
      }
      for (const [fieldKey, code] of Object.entries(userSelectionsRef.current)) {
        next[fieldKey] = code;
      }
      return next;
    });
  }, [externalDocFieldKeys, platformOverrides]);

  // Auto-select from category autoSelectCode
  useEffect(() => {
    verificationCategories.forEach(cat => {
      if (cat.autoSelectCode && !externalDocFieldKeys[cat.fieldKey] && !verifySelections[cat.fieldKey]) {
        setVerifySelections(prev => ({ ...prev, [cat.fieldKey]: cat.autoSelectCode! }));
      }
    });
  }, [verificationCategories, externalDocFieldKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync prevSelectionsRef
  useEffect(() => {
    const keys = Object.keys(verifySelections);
    if (keys.length > 0 && Object.keys(prevSelectionsRef.current).length === 0) {
      prevSelectionsRef.current = { ...verifySelections };
    }
  }, [verifySelections]);

  // --- Upload slots ---
  const uploadSlots = useMemo((): UploadSlot[] => {
    const slots: UploadSlot[] = [];
    const mandatorySlots: Array<{ categoryId: string; docCode: string; docDescription: string }> = [];

    verificationCategories.forEach(cat => {
      const selectedCode = verifySelections[cat.fieldKey];
      if (!selectedCode) return;
      const verifyItem = verifyTypes.find(v => v.code === selectedCode);
      const desc = verifyItem?.description || selectedCode;
      mandatorySlots.push({ categoryId: cat.id, docCode: selectedCode, docDescription: desc });

      const hasActiveDocForNewCode = activeDocuments.some(
        d => d.verification_category === cat.id && !d.is_supportive && (d.doc_code === selectedCode || d.document_type === selectedCode)
      );
      const needsReupload = !!pendingReupload[cat.id] && !hasActiveDocForNewCode;

      slots.push({
        key: `${cat.id}_main`,
        label: `${cat.label} — ${desc}`,
        categoryId: cat.id,
        isSupportive: false,
        docCode: selectedCode,
        docDescription: desc,
        needsReupload,
      });
    });

    verificationCategories.forEach(cat => {
      const selectedCode = verifySelections[cat.fieldKey];
      if (!selectedCode || !CODES_REQUIRING_SUPPORTIVE.includes(selectedCode)) return;
      const supportiveCode = supportiveSelections[cat.id];
      if (!supportiveCode) return;
      const supportiveItem = verifyTypes.find(v => v.code === supportiveCode);
      const supportiveDesc = supportiveItem?.description || supportiveCode;
      const matchingMandatory = mandatorySlots.find(m => m.docCode === supportiveCode && m.categoryId !== cat.id);
      const mandatoryDocsForMatch = matchingMandatory
        ? activeDocuments.filter(d => d.verification_category === matchingMandatory.categoryId && !d.is_supportive)
        : [];
      const isSatisfied = mandatoryDocsForMatch.length > 0;

      slots.push({
        key: `${cat.id}_supportive`,
        label: `Supportive: ${supportiveDesc} (for ${cat.label})`,
        categoryId: cat.id,
        isSupportive: true,
        docCode: supportiveCode,
        docDescription: supportiveDesc,
        satisfiedByMandatory: isSatisfied,
        satisfiedByCategoryId: isSatisfied ? matchingMandatory!.categoryId : undefined,
      });
    });

    return slots;
  }, [verifySelections, verificationCategories, verifyTypes, supportiveSelections, activeDocuments, pendingReupload]);

  // --- Selection errors ---
  const selectionErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    verificationCategories.forEach(cat => {
      if (cat.isMandatory && !verifySelections[cat.fieldKey]) {
        errs[cat.fieldKey] = `${cat.label} is required`;
      }
      const selectedCode = verifySelections[cat.fieldKey];
      if (selectedCode && CODES_REQUIRING_SUPPORTIVE.includes(selectedCode) && !supportiveSelections[cat.id]) {
        const isSatisfiedByAnyMandatory = SUPPORTIVE_DOC_CODES.some(supCode => {
          const matchingMandatory = verificationCategories.find(
            other => other.id !== cat.id && verifySelections[other.fieldKey] === supCode
          );
          if (!matchingMandatory) return false;
          return activeDocuments.filter(d => d.verification_category === matchingMandatory.id && !d.is_supportive).length > 0;
        });
        if (!isSatisfiedByAnyMandatory) {
          errs[`${cat.id}_supportive`] = `A supportive ID document is required when using ${verifyTypes.find(v => v.code === selectedCode)?.description || selectedCode}`;
        }
      }
    });
    return errs;
  }, [verifySelections, verificationCategories, supportiveSelections, verifyTypes, activeDocuments]);

  // --- Upload errors ---
  const uploadErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    verificationCategories.forEach(cat => {
      const selectedCode = verifySelections[cat.fieldKey];
      if (!selectedCode) return;
      const hasActivePrimaryDoc = activeDocuments.some(d => d.verification_category === cat.id && !d.is_supportive);
      if (!hasActivePrimaryDoc) {
        const desc = verifyTypes.find(v => v.code === selectedCode)?.description || selectedCode;
        errs[`${cat.id}_main`] = `Upload required: ${desc}`;
      }
      if (CODES_REQUIRING_SUPPORTIVE.includes(selectedCode)) {
        const supportiveCode = supportiveSelections[cat.id];
        if (supportiveCode) {
          const matchingMandatory = verificationCategories.find(
            other => other.id !== cat.id && verifySelections[other.fieldKey] === supportiveCode
          );
          const mandatoryDocs = matchingMandatory
            ? activeDocuments.filter(d => d.verification_category === matchingMandatory.id && !d.is_supportive)
            : [];
          if (mandatoryDocs.length === 0) {
            const hasActiveSupportiveDoc = activeDocuments.some(d => d.verification_category === cat.id && d.is_supportive);
            if (!hasActiveSupportiveDoc) {
              const supDesc = verifyTypes.find(v => v.code === supportiveCode)?.description || supportiveCode;
              errs[`${cat.id}_supportive`] = `Upload required: ${supDesc} (supportive)`;
            }
          }
        }
      }
    });
    return errs;
  }, [verifySelections, verificationCategories, supportiveSelections, verifyTypes, activeDocuments]);

  const canProceedToUpload = Object.keys(selectionErrors).length === 0 &&
    verificationCategories.filter(c => c.isMandatory).every(c => !!verifySelections[c.fieldKey]);

  // --- Fetch documents ---
  const fetchDocuments = useCallback(async () => {
    try {
      const docs = await adapter.fetchDocuments();
      setDocuments(docs);

      // Derive platform overrides
      const overrides: Record<string, string> = {};
      for (const doc of docs) {
        if (doc.is_active && doc.verification_category && !doc.is_supportive && doc.doc_code && doc.source === 'platform') {
          const fieldKey = CATEGORY_FIELD_KEY_MAP[doc.verification_category];
          if (fieldKey) overrides[fieldKey] = doc.doc_code;
        }
      }
      setPlatformOverrides(overrides);

      // Clear user selections that are now persisted
      for (const [fieldKey, code] of Object.entries(userSelectionsRef.current)) {
        if (overrides[fieldKey] === code) delete userSelectionsRef.current[fieldKey];
      }

      // Clear pending re-upload flags
      setPendingReupload(prev => {
        const next = { ...prev };
        for (const [catId, code] of Object.entries(prev)) {
          const hasActive = docs.some(
            d => d.verification_category === catId && !d.is_supportive && d.is_active !== false &&
              (d.doc_code === code || d.document_type === code)
          );
          if (hasActive) delete next[catId];
        }
        return next;
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // --- Handle verification change ---
  const handleVerificationChange = useCallback(async (cat: VerificationCategory, newCode: string) => {
    const oldCode = verifySelections[cat.fieldKey];
    userSelectionsRef.current[cat.fieldKey] = newCode;
    setVerifySelections(prev => ({ ...prev, [cat.fieldKey]: newCode }));
    onSelectionChange?.(cat.fieldKey, newCode);

    if (!CODES_REQUIRING_SUPPORTIVE.includes(newCode)) {
      setSupportiveSelections(prev => { const n = { ...prev }; delete n[cat.id]; return n; });
    }

    if (oldCode && oldCode !== newCode && adapter.deactivateByCategory) {
      await adapter.deactivateByCategory(cat.id, false);
      await adapter.deactivateByCategory(cat.id, true);
      setPendingReupload(prev => ({ ...prev, [cat.id]: newCode }));
      fetchDocuments();
      const verifyItem = verifyTypes.find(v => v.code === newCode);
      toast.info(`Document type changed to ${verifyItem?.description || newCode}`, {
        description: `Previous document has been deactivated. Please upload a new ${verifyItem?.description || newCode} in the Upload Documents section.`,
      });
    }

    prevSelectionsRef.current[cat.fieldKey] = newCode;
  }, [verifySelections, adapter, verifyTypes, onSelectionChange, fetchDocuments]);

  // --- File upload ---
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, slot: UploadSlot) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) { toast.error(`File "${file.name}" exceeds 10MB limit`); continue; }
      if (!ACCEPTED_MIME_TYPES.includes(file.type)) { toast.error(`File "${file.name}" has unsupported format. Use PDF, JPG, PNG, DOC, or TIFF.`); continue; }

      const uploadKey = `${slot.key}_${file.name}`;
      setUploading(prev => ({ ...prev, [slot.key]: true }));
      setUploadProgress(prev => ({ ...prev, [uploadKey]: 10 }));

      try {
        if (adapter.deactivateByCategory) {
          await adapter.deactivateByCategory(slot.categoryId, slot.isSupportive);
        }

        const fileExt = file.name.split('.').pop();
        const storagePath = `${Date.now()}_${slot.categoryId}_${slot.isSupportive ? 'supportive_' : ''}${file.name}`;

        setUploadProgress(prev => ({ ...prev, [uploadKey]: 40 }));
        const publicUrl = await adapter.uploadFile(file, storagePath);
        setUploadProgress(prev => ({ ...prev, [uploadKey]: 75 }));

        await adapter.insertRecord({
          slot,
          file,
          storagePath,
          publicUrl,
          userId,
          userCode,
        });

        setUploadProgress(prev => ({ ...prev, [uploadKey]: 100 }));
        toast.success(`"${file.name}" uploaded successfully`, {
          icon: React.createElement(CheckCircle2, { className: 'h-4 w-4 text-emerald-500' }),
        });

        setPendingReupload(prev => { const next = { ...prev }; delete next[slot.categoryId]; return next; });
        fetchDocuments();
        onUploadComplete?.();
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload "${file.name}"`);
      } finally {
        setUploading(prev => ({ ...prev, [slot.key]: false }));
        setTimeout(() => {
          setUploadProgress(prev => { const n = { ...prev }; delete n[uploadKey]; return n; });
        }, 2000);
      }
    }
    e.target.value = '';
  }, [adapter, userId, userCode, fetchDocuments]);

  // --- Delete document ---
  const handleDeleteDocument = useCallback(async (doc: UnifiedDocument) => {
    if (doc.source === 'external') {
      toast.error('External API documents cannot be deleted from this screen');
      return;
    }
    try {
      await adapter.deleteDocument(doc);
      toast.success('Document deleted');
      fetchDocuments();
      onUploadComplete?.();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  }, [adapter, fetchDocuments]);

  // --- Download document ---
  const handleDownloadDocument = useCallback(async (doc: UnifiedDocument) => {
    try {
      if (doc.source === 'platform' && doc.file_path && adapter.downloadFile) {
        const blob = await adapter.downloadFile(doc.file_path);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.document_name;
        a.click();
        URL.revokeObjectURL(url);
      } else if (doc.url) {
        window.open(doc.url, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  }, [adapter]);

  // --- View document ---
  const handleViewDocument = useCallback(async (doc: UnifiedDocument) => {
    try {
      if (doc.source === 'platform' && doc.file_path && adapter.downloadFile) {
        const blob = await adapter.downloadFile(doc.file_path);
        const blobUrl = URL.createObjectURL(blob);
        const ext = doc.document_name.toLowerCase();
        const category = getFileCategory(ext, blob.type);

        if (category === 'pdf') {
          const reader = new FileReader();
          reader.onloadend = () => {
            window.open(reader.result as string, '_blank');
            URL.revokeObjectURL(blobUrl);
          };
          reader.readAsDataURL(blob);
        } else {
          setPreviewDoc({ url: blobUrl, name: doc.document_name, category });
          setPreviewOpen(true);
        }
      } else if (doc.url) {
        const ext = (doc.document_name || doc.url).toLowerCase();
        const category = getFileCategory(ext);
        if (category === 'other') {
          window.open(doc.url, '_blank');
        } else {
          setPreviewDoc({ url: doc.url, name: doc.document_name, category });
          setPreviewOpen(true);
        }
      }
    } catch (error) {
      console.error('View error:', error);
      toast.error('Failed to load document');
    }
  }, [adapter]);

  // --- Close preview ---
  const handleClosePreview = useCallback(() => {
    if (previewDoc?.url && previewDoc.url.startsWith('blob:')) URL.revokeObjectURL(previewDoc.url);
    setPreviewOpen(false);
    setPreviewDoc(null);
  }, [previewDoc]);

  // --- Get docs for a slot ---
  const getDocsForSlot = useCallback((slot: UploadSlot): UnifiedDocument[] => {
    if (slot.satisfiedByMandatory && slot.satisfiedByCategoryId) {
      return activeDocuments.filter(d =>
        d.verification_category === slot.satisfiedByCategoryId && !d.is_supportive
      );
    }
    const categoryDocs = activeDocuments.filter(d =>
      d.verification_category === slot.categoryId &&
      (slot.isSupportive ? d.is_supportive === true : !d.is_supportive)
    );
    const hasPlatformDoc = categoryDocs.some(d => d.source === 'platform');
    if (hasPlatformDoc) return categoryDocs.filter(d => d.source === 'platform');
    return categoryDocs;
  }, [activeDocuments]);

  // --- Doc-type mismatch validation ---
  const validateDocTypeMismatch = useCallback((): DocTypeMismatch[] => {
    const mismatches: DocTypeMismatch[] = [];
    verificationCategories.forEach(cat => {
      const selectedCode = verifySelections[cat.fieldKey];
      if (!selectedCode) return;

      const activePlatformDoc = activeDocuments.find(
        d => d.verification_category === cat.id && !d.is_supportive && d.is_active !== false && d.source === 'platform'
      );
      if (activePlatformDoc) {
        const docCode = activePlatformDoc.doc_code;
        if (docCode && docCode !== selectedCode) {
          mismatches.push({
            categoryLabel: cat.label,
            selectedType: verifyTypes.find(v => v.code === selectedCode)?.description || selectedCode,
            documentType: verifyTypes.find(v => v.code === docCode)?.description || docCode,
          });
        }
        return;
      }

      const activeExternalDoc = activeDocuments.find(
        d => d.verification_category === cat.id && !d.is_supportive && d.is_active !== false && d.source === 'external'
      );
      if (activeExternalDoc?.doc_code) {
        const resolvedCode = activeExternalDoc.doc_code;
        const isValidVerifyCode = resolvedCode.length === 1 && 'ABCDEILMNPVX'.includes(resolvedCode);
        if (isValidVerifyCode && resolvedCode !== selectedCode) {
          mismatches.push({
            categoryLabel: cat.label,
            selectedType: verifyTypes.find(v => v.code === selectedCode)?.description || selectedCode,
            documentType: verifyTypes.find(v => v.code === resolvedCode)?.description || resolvedCode,
          });
        }
      }
    });
    return mismatches;
  }, [verificationCategories, verifySelections, activeDocuments, verifyTypes]);

  return {
    // State
    documents,
    activeDocuments,
    verifySelections,
    setVerifySelections,
    supportiveSelections,
    setSupportiveSelections,
    uploadSlots,
    selectionErrors,
    uploadErrors,
    uploading,
    uploadProgress,
    loading,
    currentStep,
    setCurrentStep,
    canProceedToUpload,
    pendingReupload,
    platformOverrides,
    verifyTypes,
    verifyLoading,
    // Preview
    previewOpen,
    previewDoc,
    // Actions
    handleVerificationChange,
    handleFileUpload,
    handleDeleteDocument,
    handleDownloadDocument,
    handleViewDocument,
    handleClosePreview,
    getDocsForSlot,
    fetchDocuments,
    validateDocTypeMismatch,
    // Refs
    userSelectionsRef,
  };
}
