import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Download, Eye, Send, Loader2, Info, CheckCircle2, FileCheck, Upload, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useVerifyTypes } from '@/hooks/useIPMasterLookups';
import { useDocumentTypeResolver } from '@/hooks/useDocumentTypeResolver';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserCode } from '@/hooks/useUserCode';
import { useDocumentStatusDropdown } from '@/hooks/useDocumentStatusDropdown';
import { useDocumentVerification } from '@/hooks/useDocumentVerification';
import { IPFormData } from '../IPRegistrationForm';
import {
  UnifiedDocument, VerificationCategory, DocumentPersistenceAdapter,
  CATEGORY_TO_VERIFY_TYPE, VERIFY_TYPE_TO_CATEGORY, EXTERNAL_DOC_TYPE_TO_VERIFY_CODE,
  mapPlatformDocs, formatSize, formatDocDate, getFileCategory, resolveExternalDocTypeToCode,
} from '@/components/documents/shared/types';
import { DocumentPreviewDialog } from '@/components/documents/shared/DocumentPreviewDialog';
import { DocumentSelectionStep } from '@/components/documents/shared/DocumentSelectionStep';
import { DocumentUploadStep } from '@/components/documents/shared/DocumentUploadStep';

interface DocumentVerificationTabProps {
  formData: IPFormData;
  onChange: (field: string, value: any) => void;
  onSave: (data: Partial<IPFormData>) => void;
  errors: Record<string, string>;
  isEditable: boolean;
  clearError?: (field: string) => void;
}

// --- IP Registration Adapter ---
function createIpRegistrationAdapter(ssn: string | undefined, uniqueUuid: string | undefined, ipStatus?: string): DocumentPersistenceAdapter {
  return {
    async fetchDocuments(): Promise<UnifiedDocument[]> {
      let query = supabase
        .from('ip_application_documents')
        .select('id, document_name, document_type, file_name, file_path, file_size, mime_type, url, signed_url, uploaded_at, verification_category, is_supportive, supportive_doc_type, verification_type, metadata')
        .order('uploaded_at', { ascending: false });

      if (ssn) {
        query = query.eq('ssn', ssn);
      } else if (uniqueUuid) {
        query = query.contains('metadata', { unique_uuid: uniqueUuid });
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((d: any) => {
        // Normalize verification_category: convert 'birth_status' → 'birth' if needed
        const rawCat = d.verification_category || d.metadata?.verification_category || null;
        const normalizedCat = rawCat ? (VERIFY_TYPE_TO_CATEGORY[rawCat] || rawCat) : null;

        // Resolve doc_code: if document_type is a valid tb_verify code use it,
        // otherwise derive from document_name (handles conversion-era 'mandatory' values)
        const rawDocType = d.document_type;
        const isValidCode = rawDocType && rawDocType.length === 1 && 'ABCDEILMNPVX'.includes(rawDocType.toUpperCase());
        const resolvedCode = isValidCode
          ? rawDocType.toUpperCase()
          : (resolveExternalDocTypeToCode(d.document_name) || resolveExternalDocTypeToCode(rawDocType) || rawDocType || null);

        return {
          id: d.id,
          document_type: d.document_name || d.document_type || '',
          document_name: d.file_name || d.document_name || '',
          file_path: d.file_path || '',
          file_size: d.file_size || 0,
          uploaded_at: d.uploaded_at || '',
          verification_category: normalizedCat,
          supportive_doc_type: d.supportive_doc_type || d.metadata?.supportive_doc_type || null,
          is_supportive: d.is_supportive ?? d.metadata?.is_supportive ?? false,
          source: 'platform' as const,
          url: d.url || d.signed_url || '',
          doc_code: resolvedCode,
          is_active: true,
        };
      });
    },

    async uploadFile(file: File, storagePath: string): Promise<string> {
      const isDraftOrPending = ipStatus === 'Z' || ipStatus === 'D' || ipStatus === 'P';
      
      if (isDraftOrPending) {
        // Upload to storage bucket
        const fileExt = file.name.split('.').pop();
        const fileName = `${uniqueUuid}/${storagePath.split('_')[1]}_${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from('ip-documents').upload(fileName, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('ip-documents').getPublicUrl(fileName);
        (this as any)._lastUploadPath = fileName;
        (this as any)._uploadedToDms = false;
        return urlData?.publicUrl || '';
      } else {
        // Upload to DMS via edge function
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        const formDataPayload = new FormData();
        formDataPayload.append('file', file);
        formDataPayload.append('ssn', ssn || '');
        formDataPayload.append('documentType', storagePath);
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dms-transfer-single`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
            body: formDataPayload,
          }
        );
        
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error((errBody as any)?.error || `DMS upload failed: HTTP ${response.status}`);
        }
        
        const result = await response.json();
        (this as any)._lastUploadPath = '';
        (this as any)._uploadedToDms = true;
        (this as any)._dmsDocId = result.dms_document_id || null;
        return '';
      }
    },

    async insertRecord(params: any): Promise<void> {
      const { slot, file, publicUrl, userId } = params;
      const filePath = (this as any)._lastUploadPath || '';
      const uploadedToDms = (this as any)._uploadedToDms || false;
      const dmsDocId = (this as any)._dmsDocId || null;
      const verType = CATEGORY_TO_VERIFY_TYPE[slot.categoryId] || null;

      // Check for existing record with same ssn + verification_type to upsert
      let existingId: string | null = null;
      if (ssn && verType) {
        const { data: existing } = await supabase
          .from('ip_application_documents')
          .select('id')
          .eq('ssn', ssn)
          .eq('verification_type', verType)
          .eq('is_supportive', slot.isSupportive || false)
          .limit(1)
          .single();
        if (existing) existingId = existing.id;
      }

      const recordData = {
        ssn: ssn || null,
        application_reference_number: null,
        document_name: slot.docDescription,
        document_type: slot.docCode, // Store the actual doc code (e.g., 'B', 'I', 'M')
        file_name: file.name,
        file_path: filePath,
        url: publicUrl || null,
        signed_url: publicUrl || null,
        mime_type: file.type,
        file_size: file.size,
        created_by: userId,
        uploaded_by: userId,
        transfer_status: uploadedToDms ? 'Transferred' : 'Pending',
        dms_document_id: dmsDocId,
        verification_type: verType,
        verification_category: slot.categoryId,
        is_supportive: slot.isSupportive,
        supportive_doc_type: slot.isSupportive ? slot.docCode : null,
        metadata: { unique_uuid: uniqueUuid },
      };

      if (existingId) {
        // Update existing record
        const { error } = await supabase
          .from('ip_application_documents')
          .update(recordData)
          .eq('id', existingId);
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('ip_application_documents')
          .insert(recordData);
        if (error) throw error;
      }

      // Update verify_*_code in ip_master
      if (ssn && verType && !slot.isSupportive) {
        const verTypeToVerifyCode: Record<string, string> = {
          birth_status: 'verify_birth_code',
          name_status: 'verify_name_code',
          marital_status: 'verify_marital_code',
          death_status: 'verify_death_code',
        };
        const verifyField = verTypeToVerifyCode[verType];
        if (verifyField) {
          await supabase
            .from('ip_master')
            .update({ [verifyField]: slot.docCode })
            .eq('ssn', ssn);
        }
      }
    },

    async deleteDocument(doc: UnifiedDocument): Promise<void> {
      if (doc.file_path) {
        await supabase.storage.from('ip-documents').remove([doc.file_path]);
      }
      const { error } = await supabase.from('ip_application_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },

    async downloadFile(filePath: string): Promise<Blob> {
      const { data, error } = await supabase.storage.from('ip-documents').download(filePath);
      if (error) throw error;
      return data;
    },
  };
}

// --- App Doc helpers (for bottom table) ---
interface AppDoc {
  id: string;
  document_name: string | null;
  document_type: string | null;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  url: string | null;
  signed_url: string | null;
  uploaded_at: string | null;
  transfer_status: string;
  dms_document_id: string | null;
  verification_type: string | null;
  birth_status: string | null;
  name_status: string | null;
  marital_status: string | null;
  death_status: string | null;
}

function getAppDocUrl(doc: AppDoc): string | undefined {
  if (doc.signed_url) return doc.signed_url;
  if (doc.url) return doc.url;
  if (doc.file_path) {
    const { data } = supabase.storage.from('ip-documents').getPublicUrl(doc.file_path);
    return data?.publicUrl || undefined;
  }
  return undefined;
}

function getAppDocName(doc: AppDoc, index: number): string {
  return doc.document_name || doc.file_name || `Document ${index + 1}`;
}

function getTransferBadge(status: string) {
  switch (status) {
    case 'Transferred': return <Badge variant="default" className="bg-emerald-600 text-xs">Transferred</Badge>;
    case 'InProgress': return <Badge variant="secondary" className="text-xs">In Progress</Badge>;
    case 'Failed': return <Badge variant="destructive" className="text-xs">Failed</Badge>;
    default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function getAppDocFileIcon(doc: AppDoc) {
  const cat = getFileCategory(doc.file_name || doc.document_name || '', doc.mime_type || '');
  if (cat === 'pdf') return <FileText className="h-5 w-5 text-destructive" />;
  if (cat === 'image') return <Eye className="h-5 w-5 text-primary" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

export default function DocumentVerificationTab({ formData, onChange, onSave, errors, isEditable, clearError }: DocumentVerificationTabProps) {
  const { user } = useAuth();
  const { userCode } = useUserCode();
  const { resolveDocType } = useDocumentTypeResolver();
  const queryClient = useQueryClient();
  const ssn = formData.ssn;
  const [prefillApplied, setPrefillApplied] = useState(false);

  // Create adapter
  const adapter = useMemo(() => createIpRegistrationAdapter(ssn, formData.unique_uuid, formData.status), [ssn, formData.unique_uuid, formData.status]);

  // Verification categories
  const verificationCategories = useMemo((): VerificationCategory[] => {
    const categories: VerificationCategory[] = [];
    categories.push({
      id: 'birth', label: 'Birth Status Verification', fieldKey: 'birth_doc_type',
      isMandatory: true, tooltip: 'Select the document that verifies the applicant\'s birth. Birth Certificate or Baptism Certificate require an additional supportive ID document.',
    });
    categories.push({
      id: 'name', label: 'Name Status Verification', fieldKey: 'name_doc_type',
      isMandatory: true, tooltip: 'Select the document that verifies the applicant\'s legal name. Required for all registrations.',
    });
    const isMarried = formData.marital_status === 'Married' || formData.marital_status === 'M' ||
                      formData.marital_status === 'Common Law' || formData.marital_status === 'C';
    categories.push({
      id: 'marital', label: 'Marital Status Verification', fieldKey: 'marital_doc_type',
      isMandatory: isMarried,
      tooltip: isMarried ? 'Marriage Certificate is required because the applicant declared a married or common law status.' : 'Optional. Select a document if you want to verify marital status.',
      autoSelectCode: isMarried ? 'M' : undefined,
    });
    const hasDeathDoc = !!formData.death_doc_type;
    categories.push({
      id: 'death', label: 'Death Status Verification', fieldKey: 'death_doc_type',
      isMandatory: hasDeathDoc,
      tooltip: hasDeathDoc ? 'Certificate of Death is required because death verification has been indicated.' : 'Optional. Select if the insured person is deceased.',
      autoSelectCode: hasDeathDoc ? 'C' : undefined,
    });
    return categories;
  }, [formData.marital_status, formData.death_doc_type]);

  // Use shared hook
  const hook = useDocumentVerification({
    adapter,
    verificationCategories,
    onSelectionChange: (fieldKey, code) => {
      onChange(fieldKey, code);
      clearError?.(fieldKey);
      // Also update verify_*_code in ip_master
      const fieldToVerifyCode: Record<string, string> = {
        birth_doc_type: 'verify_birth_code',
        name_doc_type: 'verify_name_code',
        marital_doc_type: 'verify_marital_code',
        death_doc_type: 'verify_death_code',
      };
      const verifyField = fieldToVerifyCode[fieldKey];
      if (verifyField && ssn) {
        supabase
          .from('ip_master')
          .update({ [verifyField]: code })
          .eq('ssn', ssn)
          .then(({ error }) => {
            if (error) console.error(`Failed to update ${verifyField}:`, error);
          });
      }
    },
    onUploadComplete: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-application-documents', ssn] });
    },
    userId: user?.id,
    userCode: userCode || undefined,
  });

  // Sync formData selections → hook
  useEffect(() => {
    const formSelections: Record<string, string> = {};
    verificationCategories.forEach(cat => {
      const val = (formData as any)[cat.fieldKey];
      if (val) formSelections[cat.fieldKey] = val;
    });
    if (Object.keys(formSelections).length > 0) {
      hook.setVerifySelections(prev => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(formSelections)) {
          if (!next[k]) next[k] = v;
        }
        return next;
      });
    }
  }, [formData.birth_doc_type, formData.name_doc_type, formData.marital_doc_type, formData.death_doc_type]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Application documents (bottom table) ---
  const { data: appDocs = [], isLoading: appDocsLoading } = useQuery({
    queryKey: ['ip-application-documents', ssn],
    queryFn: async () => {
      if (!ssn) return [];
      const { data, error } = await supabase
        .from('ip_application_documents')
        .select('id, document_name, document_type, file_name, file_path, file_size, mime_type, url, signed_url, uploaded_at, transfer_status, dms_document_id, verification_type, birth_status, name_status, marital_status, death_status')
        .eq('ssn', ssn)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AppDoc[];
    },
    enabled: !!ssn,
    staleTime: 60000,
  });

  // --- Prefill verification dropdowns from ip_application_documents ---
  useEffect(() => {
    if (prefillApplied || !appDocs.length || !ssn) return;

    const verTypeToFormField: Record<string, { docField: string; verifyField: string; fieldKey: string }> = {
      birth_status: { docField: 'birth_doc_type', verifyField: 'verify_birth_code', fieldKey: 'birth_doc_type' },
      name_status: { docField: 'name_doc_type', verifyField: 'verify_name_code', fieldKey: 'name_doc_type' },
      marital_status: { docField: 'marital_doc_type', verifyField: 'verify_marital_code', fieldKey: 'marital_doc_type' },
      death_status: { docField: 'death_doc_type', verifyField: 'verify_death_code', fieldKey: 'death_doc_type' },
    };

    let hasChanges = false;
    const updates: Record<string, string> = {};
    const selectionsToSet: Record<string, string> = {};

    for (const doc of appDocs) {
      const vt = doc.verification_type;
      if (!vt || !verTypeToFormField[vt]) continue;
      const { docField, verifyField, fieldKey } = verTypeToFormField[vt];

      // Resolve doc code: if document_type is a valid single-char code use it,
      // otherwise derive from document_name (handles 'mandatory' values from conversion)
      const rawDocType = doc.document_type;
      const isValidCode = rawDocType && rawDocType.length === 1 && 'ABCDEILMNPVX'.includes(rawDocType.toUpperCase());
      const resolvedCode = isValidCode
        ? rawDocType!.toUpperCase()
        : (resolveExternalDocTypeToCode(doc.document_name) || resolveExternalDocTypeToCode(rawDocType) || null);
      if (!resolvedCode) continue;

      // Only prefill if formData doesn't already have a value for this field
      const currentVal = (formData as any)[docField];
      if (!currentVal) {
        onChange(docField, resolvedCode);
        updates[verifyField] = resolvedCode;
        selectionsToSet[fieldKey] = resolvedCode;
        hasChanges = true;
      }
    }

    // Directly set verifySelections in the hook for immediate UI update
    if (Object.keys(selectionsToSet).length > 0) {
      hook.setVerifySelections(prev => ({ ...prev, ...selectionsToSet }));
    }

    // Also update verify codes in ip_master
    if (hasChanges && Object.keys(updates).length > 0) {
      supabase
        .from('ip_master')
        .update(updates)
        .eq('ssn', ssn)
        .then(({ error }) => {
          if (error) console.error('Failed to update verify codes:', error);
        });
    }

    setPrefillApplied(true);
  }, [appDocs, ssn, prefillApplied, formData, onChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const { getStatusValue, hasStatusDropdown, handleStatusChange, getStatusLabel, isSaving } = useDocumentStatusDropdown(appDocs);
  const { data: verifyTypes = [] } = useVerifyTypes();

  const { data: dmsEligibility } = useQuery({
    queryKey: ['dms-transfer-eligibility', ssn],
    queryFn: async () => {
      if (!ssn) return { can_transfer_to_dms: false };
      const { data, error } = await supabase.rpc('check_dms_transfer_eligibility', { p_ssn: ssn });
      if (error) throw error;
      return data as any;
    },
    enabled: !!ssn,
    staleTime: 30000,
  });
  const canTransferToDms = dmsEligibility?.can_transfer_to_dms === true;

  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [transferringDocId, setTransferringDocId] = useState<string | null>(null);

  // Blob fetcher for app docs
  const isLocalStorageUrl = useCallback((url: string) => {
    return url.includes('/storage/v1/object/public/ip-documents/') || url.includes('/storage/v1/object/ip-documents/');
  }, []);

  const extractFilePath = useCallback((url: string) => {
    const marker = '/storage/v1/object/public/ip-documents/';
    const idx = url.indexOf(marker);
    if (idx >= 0) return decodeURIComponent(url.substring(idx + marker.length));
    return null;
  }, []);

  const fetchDocBlob = useCallback(async (docUrl: string, fileName: string, action: 'stream' | 'download') => {
    if (isLocalStorageUrl(docUrl)) {
      const filePath = extractFilePath(docUrl);
      if (filePath) {
        const { data, error } = await supabase.storage.from('ip-documents').download(filePath);
        if (error) throw new Error(`Storage download failed: ${error.message}`);
        return data;
      }
    }
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const proxyResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document-proxy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ action, documentUrl: docUrl, fileName }),
      }
    );
    if (!proxyResponse.ok) {
      const errBody = await proxyResponse.json().catch(() => ({}));
      throw new Error((errBody as any)?.error || `HTTP ${proxyResponse.status}`);
    }
    const contentType = proxyResponse.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await proxyResponse.arrayBuffer();
    return new Blob([arrayBuffer], { type: contentType });
  }, [isLocalStorageUrl, extractFilePath]);

  const blobToDataUrl = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  const handleViewAppDoc = useCallback(async (doc: AppDoc, index: number) => {
    const docUrl = getAppDocUrl(doc);
    if (!docUrl) { toast.error('No document URL available'); return; }
    const category = getFileCategory(doc.file_name || doc.document_name || '', doc.mime_type || '');
    const name = getAppDocName(doc, index);
    setLoadingDocId(doc.id);
    try {
      const blob = await fetchDocBlob(docUrl, name, 'stream');
      if (category === 'pdf') {
        const dataUrl = await blobToDataUrl(blob);
        window.open(dataUrl, '_blank');
      } else {
        const blobUrl = URL.createObjectURL(blob);
        hook.previewDoc; // we use our own local preview for app docs
        setAppPreviewDoc({ url: blobUrl, name, category });
        setAppPreviewOpen(true);
      }
    } catch (err: any) {
      toast.error('Failed to load document', { description: err.message });
    } finally {
      setLoadingDocId(null);
    }
  }, [fetchDocBlob, blobToDataUrl]);

  const handleDownloadAppDoc = useCallback(async (doc: AppDoc, index: number) => {
    const docUrl = getAppDocUrl(doc);
    if (!docUrl) { toast.error('No document URL available'); return; }
    const name = getAppDocName(doc, index);
    setLoadingDocId(doc.id);
    try {
      const blob = await fetchDocBlob(docUrl, name, 'download');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      toast.success('Download started', { description: name });
    } catch (err: any) {
      toast.error('Failed to download document', { description: err.message });
    } finally {
      setLoadingDocId(null);
    }
  }, [fetchDocBlob]);

  const [appPreviewOpen, setAppPreviewOpen] = useState(false);
  const [appPreviewDoc, setAppPreviewDoc] = useState<{ url: string; name: string; category: 'pdf' | 'image' | 'other' } | null>(null);
  const handleCloseAppPreview = useCallback(() => {
    if (appPreviewDoc?.url) URL.revokeObjectURL(appPreviewDoc.url);
    setAppPreviewOpen(false);
    setAppPreviewDoc(null);
  }, [appPreviewDoc]);

  const handleTransferToDms = useCallback(async (doc: AppDoc) => {
    if (!ssn || !userCode) { toast.error('Cannot transfer', { description: 'User code or SSN not available' }); return; }
    setTransferringDocId(doc.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dms-transfer-single`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ documentId: doc.id, ssn, userCode }),
        }
      );
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || `HTTP ${response.status}`);
      toast.success('Document transferred to DMS', { description: doc.document_name || doc.file_name || 'Document' });
      queryClient.invalidateQueries({ queryKey: ['ip-application-documents', ssn] });
      queryClient.invalidateQueries({ queryKey: ['dms-transfer-eligibility', ssn] });
    } catch (err: any) {
      toast.error('DMS transfer failed', { description: err.message });
    } finally {
      setTransferringDocId(null);
    }
  }, [ssn, userCode, queryClient]);

  // Legacy docs
  const legacyDocs = hook.activeDocuments.filter(d => !d.verification_category);
  const externalUncategorizedDocs = hook.activeDocuments.filter(d => !d.verification_category && d.source === 'external');
  const platformLegacyDocs = hook.activeDocuments.filter(d => !d.verification_category && d.source === 'platform');

  // Step indicator

  return (
    <TooltipProvider>
      <div className="space-y-6">
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
            selectionErrors={{ ...hook.selectionErrors, ...Object.fromEntries(Object.entries(errors).filter(([k]) => verificationCategories.some(c => c.fieldKey === k))) }}
            verifyTypes={hook.verifyTypes}
            verifyLoading={hook.verifyLoading}
            isEditable={isEditable}
            canProceedToUpload={hook.canProceedToUpload}
            documents={hook.documents}
            pendingReupload={hook.pendingReupload}
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
            isEditable={isEditable}
            verificationCategories={verificationCategories}
            onFileUpload={hook.handleFileUpload}
            onDelete={hook.handleDeleteDocument}
            onDownload={hook.handleDownloadDocument}
            onView={hook.handleViewDocument}
            onBackToSelection={() => hook.setCurrentStep('selection')}
            getDocsForSlot={hook.getDocsForSlot}
            legacyDocs={platformLegacyDocs}
          />
        )}

        {/* Application Documents (SSN-linked bottom table) */}
        {ssn && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Application Documents
                <Badge variant="secondary">{appDocs.length}</Badge>
              </CardTitle>
              <CardDescription>Documents submitted with the online application for SSN: {ssn}</CardDescription>
            </CardHeader>
            <CardContent>
              {appDocsLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading application documents…</span>
                </div>
              ) : appDocs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Verification Status</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Transfer Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appDocs.map((doc, index) => {
                      const isLoading = loadingDocId === doc.id;
                      const hasUrl = !!getAppDocUrl(doc);
                      const showDropdown = hasStatusDropdown(doc);
                      const statusVal = getStatusValue(doc.id);
                      const statusLabel = getStatusLabel(doc.verification_type);
                      return (
                        <TableRow key={doc.id}>
                          <TableCell>{getAppDocFileIcon(doc)}</TableCell>
                          <TableCell className="font-medium">{getAppDocName(doc, index)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{resolveDocType(doc.document_type) !== doc.document_type ? resolveDocType(doc.document_type) : (doc.document_name || resolveDocType(doc.document_type))}</Badge></TableCell>
                          <TableCell>
                            {showDropdown ? (
                              isEditable ? (
                                <Select value={statusVal || undefined} onValueChange={(v) => handleStatusChange(doc.id, doc.verification_type!, v)} disabled={isSaving[doc.id]}>
                                  <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder={`Select ${statusLabel}`} /></SelectTrigger>
                                  <SelectContent>
                                    {verifyTypes.map(v => (<SelectItem key={v.code} value={v.code}>{v.description || v.code}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs font-medium text-muted-foreground">{statusLabel}</span>
                                  <Badge variant="outline" className="text-xs w-fit">
                                    {statusVal ? (verifyTypes.find(v => v.code === statusVal)?.description || statusVal) : 'Not Set'}
                                  </Badge>
                                </div>
                              )
                            ) : (
                              doc.verification_type ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs font-medium text-muted-foreground">{getStatusLabel(doc.verification_type)}</span>
                                  <Badge variant="outline" className="text-xs w-fit">Not Set</Badge>
                                </div>
                              ) : <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatSize(doc.file_size)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatDocDate(doc.uploaded_at)}</TableCell>
                          <TableCell>{getTransferBadge(doc.transfer_status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end flex-wrap">
                              {hasUrl ? (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => handleViewAppDoc(doc, index)} disabled={isLoading} className="gap-1.5">
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                                    View
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDownloadAppDoc(doc, index)} disabled={isLoading} className="gap-1.5">
                                    <Download className="h-4 w-4" />
                                    Download
                                  </Button>
                                </>
                              ) : <span className="text-xs text-muted-foreground italic">No file available</span>}
                              {canTransferToDms && doc.transfer_status !== 'Transferred' && (
                                <Button variant="default" size="sm" onClick={() => handleTransferToDms(doc)} disabled={transferringDocId === doc.id} className="gap-1.5">
                                  {transferringDocId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                  {transferringDocId === doc.id ? 'Transferring…' : 'Transfer to DMS'}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No application documents found</p>
                  <p className="text-sm mt-1">No documents have been submitted for this insured person's application</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Preview dialogs */}
        <DocumentPreviewDialog open={hook.previewOpen} previewDoc={hook.previewDoc} onClose={hook.handleClosePreview} />
        <DocumentPreviewDialog open={appPreviewOpen} previewDoc={appPreviewDoc} onClose={handleCloseAppPreview} />
      </div>
    </TooltipProvider>
  );
}
