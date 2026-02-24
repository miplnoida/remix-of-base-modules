import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { IPFormData } from '../IPRegistrationForm';
import {
  Upload, File, Trash2, Download, FileText, Eye, Image as ImageIcon,
  AlertTriangle, Loader2, Send, CheckCircle2, Info, ChevronRight, ChevronLeft,
  ShieldCheck, FileCheck, X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useVerifyTypes } from '@/hooks/useIPMasterLookups';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useUserCode } from '@/hooks/useUserCode';

interface DocumentVerificationTabProps {
  formData: IPFormData;
  onChange: (field: string, value: any) => void;
  onSave: (data: Partial<IPFormData>) => void;
  errors: Record<string, string>;
  isEditable: boolean;
  clearError?: (field: string) => void;
}

interface UploadedDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  verification_category?: string | null;
  supportive_doc_type?: string | null;
  is_supportive?: boolean;
}

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
}

// Verification category definitions
interface VerificationCategory {
  id: string;
  label: string;
  formField: string; // field in IPFormData
  isMandatory: boolean;
  tooltip: string;
  autoSelectCode?: string; // auto-select this verify code
}

// Document codes that require a supportive document (ID Card or ID Letter)
const CODES_REQUIRING_SUPPORTIVE = ['B', 'V']; // Birth Certificate, Baptism Certificate
const SUPPORTIVE_DOC_CODES = ['I', 'L']; // Identification Card, Identification Letter

// File upload constraints
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.tif', '.tiff'];
const ACCEPTED_MIME_TYPES = [
  'application/pdf', 'image/jpeg', 'image/png',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/tiff'
];

// --- Helpers ---
function getAppDocUrl(doc: AppDoc): string | undefined {
  // Priority: signed_url > url > storage public URL from file_path
  if (doc.signed_url) return doc.signed_url;
  if (doc.url) return doc.url;
  if (doc.file_path) {
    // Generate public URL from Supabase storage
    const { data } = supabase.storage.from('ip-documents').getPublicUrl(doc.file_path);
    return data?.publicUrl || undefined;
  }
  return undefined;
}
function getAppDocName(doc: AppDoc, index: number): string {
  return doc.document_name || doc.file_name || `Document ${index + 1}`;
}
function getAppDocCategory(doc: AppDoc): 'pdf' | 'image' | 'other' {
  const name = (doc.file_name || doc.document_name || '').toLowerCase();
  const mime = (doc.mime_type || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mime.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/.test(name)) return 'image';
  return 'other';
}
function getAppDocFileIcon(doc: AppDoc) {
  const cat = getAppDocCategory(doc);
  if (cat === 'pdf') return <FileText className="h-5 w-5 text-destructive" />;
  if (cat === 'image') return <ImageIcon className="h-5 w-5 text-primary" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}
function formatSize(size?: number | null): string {
  if (size === undefined || size === null) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDocDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), 'MMM dd, yyyy'); } catch { return dateStr; }
}
function getTransferBadge(status: string) {
  switch (status) {
    case 'Transferred': return <Badge variant="default" className="bg-emerald-600 text-xs">Transferred</Badge>;
    case 'InProgress': return <Badge variant="secondary" className="text-xs">In Progress</Badge>;
    case 'Failed': return <Badge variant="destructive" className="text-xs">Failed</Badge>;
    default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

export default function DocumentVerificationTab({ formData, onChange, onSave, errors, isEditable, clearError }: DocumentVerificationTabProps) {
  const { user } = useAuth();
  const { userCode } = useUserCode();
  const queryClient = useQueryClient();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<'selection' | 'upload'>('selection');

  // Supportive document selections per verification category
  const [supportiveSelections, setSupportiveSelections] = useState<Record<string, string>>({});

  // Application documents state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; category: 'pdf' | 'image' | 'other' } | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [transferringDocId, setTransferringDocId] = useState<string | null>(null);

  const { data: verifyTypes = [], isLoading: verifyLoading } = useVerifyTypes();

  // Fetch application documents from ip_application_documents by SSN
  const ssn = formData.ssn;
  const { data: appDocs = [], isLoading: appDocsLoading } = useQuery({
    queryKey: ['ip-application-documents', ssn],
    queryFn: async () => {
      if (!ssn) return [];
      const { data, error } = await supabase
        .from('ip_application_documents')
        .select('id, document_name, document_type, file_name, file_path, file_size, mime_type, url, signed_url, uploaded_at, transfer_status, dms_document_id')
        .eq('ssn', ssn)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AppDoc[];
    },
    enabled: !!ssn,
    staleTime: 60000,
  });

  // Backend-driven DMS transfer eligibility check
  const { data: dmsEligibility } = useQuery({
    queryKey: ['dms-transfer-eligibility', ssn],
    queryFn: async () => {
      if (!ssn) return { can_transfer_to_dms: false };
      const { data, error } = await supabase.rpc('check_dms_transfer_eligibility', { p_ssn: ssn });
      if (error) throw error;
      return data as { can_transfer_to_dms: boolean; reason: string; message: string; application_status: string | null; pending_document_count: number };
    },
    enabled: !!ssn,
    staleTime: 30000,
  });
  const canTransferToDms = dmsEligibility?.can_transfer_to_dms === true;

  // --- Dynamic verification categories based on form data ---
  const verificationCategories = useMemo((): VerificationCategory[] => {
    const categories: VerificationCategory[] = [];

    // Birth Status Verification - always mandatory
    categories.push({
      id: 'birth',
      label: 'Birth Status Verification',
      formField: 'birth_doc_type',
      isMandatory: true,
      tooltip: 'Select the document that verifies the applicant\'s birth. Birth Certificate or Baptism Certificate require an additional supportive ID document.',
    });

    // Name Status Verification - always mandatory
    categories.push({
      id: 'name',
      label: 'Name Status Verification',
      formField: 'name_doc_type',
      isMandatory: true,
      tooltip: 'Select the document that verifies the applicant\'s legal name. Required for all registrations.',
    });

    // Marital Status Verification - mandatory if married/common law
    const isMarried = formData.marital_status === 'Married' || formData.marital_status === 'M' ||
                      formData.marital_status === 'Common Law' || formData.marital_status === 'C';
    categories.push({
      id: 'marital',
      label: 'Marital Status Verification',
      formField: 'marital_doc_type',
      isMandatory: isMarried,
      tooltip: isMarried
        ? 'Marriage Certificate is required because the applicant declared a married or common law status.'
        : 'Optional. Select a document if you want to verify marital status.',
      autoSelectCode: isMarried ? 'M' : undefined,
    });

    // Death Status Verification - mandatory if death_doc_type already set (or user selects it)
    const hasDeathDoc = !!formData.death_doc_type;
    categories.push({
      id: 'death',
      label: 'Death Status Verification',
      formField: 'death_doc_type',
      isMandatory: hasDeathDoc,
      tooltip: hasDeathDoc
        ? 'Certificate of Death is required because death verification has been indicated.'
        : 'Optional. Select if the insured person is deceased.',
      autoSelectCode: hasDeathDoc ? 'C' : undefined,
    });

    return categories;
  }, [formData.marital_status, formData.death_doc_type]);

  // Auto-select logic
  useEffect(() => {
    verificationCategories.forEach(cat => {
      if (cat.autoSelectCode) {
        const currentValue = (formData as any)[cat.formField];
        if (!currentValue) {
          onChange(cat.formField, cat.autoSelectCode);
        }
      }
    });
  }, [verificationCategories]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if a selected doc code requires a supportive document
  const getRequiresSupportive = useCallback((categoryId: string): boolean => {
    const cat = verificationCategories.find(c => c.id === categoryId);
    if (!cat) return false;
    const selectedCode = (formData as any)[cat.formField];
    return CODES_REQUIRING_SUPPORTIVE.includes(selectedCode);
  }, [formData, verificationCategories]);

  // Compute which upload slots are needed
  const uploadSlots = useMemo(() => {
    const slots: Array<{
      key: string;
      label: string;
      categoryId: string;
      isSupportive: boolean;
      docCode: string;
      docDescription: string;
      satisfiedByMandatory?: boolean; // auto-satisfied by a mandatory upload of same type
      satisfiedByCategoryId?: string; // which mandatory category satisfies it
    }> = [];

    // First pass: collect all mandatory (non-supportive) slots
    const mandatorySlots: Array<{ categoryId: string; docCode: string; docDescription: string }> = [];

    verificationCategories.forEach(cat => {
      const selectedCode = (formData as any)[cat.formField];
      if (!selectedCode) return;

      const verifyItem = verifyTypes.find(v => v.code === selectedCode);
      const desc = verifyItem?.description || selectedCode;
      mandatorySlots.push({ categoryId: cat.id, docCode: selectedCode, docDescription: desc });

      slots.push({
        key: `${cat.id}_main`,
        label: `${cat.label} — ${desc}`,
        categoryId: cat.id,
        isSupportive: false,
        docCode: selectedCode,
        docDescription: desc,
      });
    });

    // Second pass: add supportive slots, checking if already satisfied by a mandatory upload
    verificationCategories.forEach(cat => {
      const selectedCode = (formData as any)[cat.formField];
      if (!selectedCode || !CODES_REQUIRING_SUPPORTIVE.includes(selectedCode)) return;

      const supportiveCode = supportiveSelections[cat.id];
      if (!supportiveCode) return;

      const supportiveItem = verifyTypes.find(v => v.code === supportiveCode);
      const supportiveDesc = supportiveItem?.description || supportiveCode;

      // Check if ANY mandatory slot has the same doc code AND has uploaded documents
      const matchingMandatory = mandatorySlots.find(
        m => m.docCode === supportiveCode && m.categoryId !== cat.id
      );
      const mandatoryDocsForMatch = matchingMandatory
        ? documents.filter(d => d.verification_category === matchingMandatory.categoryId && !d.is_supportive)
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
  }, [formData, verificationCategories, verifyTypes, supportiveSelections, documents]);

  // Validation: can we proceed to upload?
  // Helper: check if a supportive requirement is satisfied by a mandatory upload of same doc type
  const isSupportiveSatisfiedByMandatory = useCallback((catId: string, supportiveCode: string): boolean => {
    const matchingMandatory = verificationCategories.find(
      other => other.id !== catId && (formData as any)[other.formField] === supportiveCode
    );
    if (!matchingMandatory) return false;
    return documents.filter(d => d.verification_category === matchingMandatory.id && !d.is_supportive).length > 0;
  }, [verificationCategories, formData, documents]);

  const selectionErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    verificationCategories.forEach(cat => {
      if (cat.isMandatory && !(formData as any)[cat.formField]) {
        errs[cat.formField] = `${cat.label} is required`;
      }
      // Check supportive document requirement — skip if already satisfied by mandatory
      const selectedCode = (formData as any)[cat.formField];
      if (selectedCode && CODES_REQUIRING_SUPPORTIVE.includes(selectedCode) && !supportiveSelections[cat.id]) {
        // Check if the supportive requirement is auto-satisfied by a matching mandatory upload
        // Look for ANY mandatory category (other than this one) that uses a supportive-eligible doc code AND has uploads
        const isSatisfiedByAnyMandatory = SUPPORTIVE_DOC_CODES.some(supCode => {
          const matchingMandatory = verificationCategories.find(
            other => other.id !== cat.id && (formData as any)[other.formField] === supCode
          );
          if (!matchingMandatory) return false;
          return documents.filter(d => d.verification_category === matchingMandatory.id && !d.is_supportive).length > 0;
        });
        if (!isSatisfiedByAnyMandatory) {
          errs[`${cat.id}_supportive`] = `A supportive ID document is required when using ${verifyTypes.find(v => v.code === selectedCode)?.description || selectedCode}`;
        }
      }
    });
    return errs;
  }, [formData, verificationCategories, supportiveSelections, verifyTypes, documents]);

  const canProceedToUpload = Object.keys(selectionErrors).length === 0 &&
    verificationCategories.filter(c => c.isMandatory).every(c => !!(formData as any)[c.formField]);

  // --- Document fetching ---
  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ip_documents')
        .select('*')
        .eq('unique_uuid', formData.unique_uuid)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      setDocuments((data || []) as UploadedDocument[]);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [formData.unique_uuid]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // --- File upload ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: typeof uploadSlots[0]) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File "${file.name}" exceeds 10MB limit`);
        continue;
      }
      if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
        toast.error(`File "${file.name}" has unsupported format. Use PDF, JPG, PNG, DOC, or TIFF.`);
        continue;
      }

      const uploadKey = `${slot.key}_${file.name}`;
      setUploading(prev => ({ ...prev, [slot.key]: true }));
      setUploadProgress(prev => ({ ...prev, [uploadKey]: 10 }));

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${formData.unique_uuid}/${slot.categoryId}_${slot.isSupportive ? 'supportive_' : ''}${Date.now()}.${fileExt}`;

        setUploadProgress(prev => ({ ...prev, [uploadKey]: 40 }));

        const { error: uploadError } = await supabase.storage
          .from('ip-documents')
          .upload(fileName, file);
        if (uploadError) throw uploadError;

        setUploadProgress(prev => ({ ...prev, [uploadKey]: 60 }));

        // Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from('ip-documents')
          .getPublicUrl(fileName);
        const publicUrl = urlData?.publicUrl || '';

        setUploadProgress(prev => ({ ...prev, [uploadKey]: 75 }));

        // Insert into ip_documents (verification tracking)
        const { error: dbError } = await supabase
          .from('ip_documents')
          .insert({
            unique_uuid: formData.unique_uuid,
            document_type: slot.docDescription,
            document_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user?.id,
            is_temp: true,
            verification_category: slot.categoryId,
            supportive_doc_type: slot.isSupportive ? slot.docCode : null,
            is_supportive: slot.isSupportive,
          });
        if (dbError) throw dbError;

        setUploadProgress(prev => ({ ...prev, [uploadKey]: 90 }));

        // Also insert into ip_application_documents (SSN-based, for DMS transfer)
        if (ssn) {
          const { error: appDocError } = await supabase
            .from('ip_application_documents')
            .insert({
              ssn,
              document_name: slot.docDescription,
              document_type: slot.isSupportive ? 'supportive' : 'mandatory',
              file_name: file.name,
              file_path: fileName,
              url: publicUrl,
              mime_type: file.type,
              file_size: file.size,
              created_by: user?.id,
              transfer_status: 'Pending',
              metadata: {
                verification_category: slot.categoryId,
                is_supportive: slot.isSupportive,
                supportive_doc_type: slot.isSupportive ? slot.docCode : null,
                unique_uuid: formData.unique_uuid,
              },
            });
          if (appDocError) {
            console.error('Error inserting into ip_application_documents:', appDocError);
            // Non-blocking: doc is already in ip_documents, log but don't fail
          }
        }

        setUploadProgress(prev => ({ ...prev, [uploadKey]: 100 }));
        toast.success(`"${file.name}" uploaded successfully`, {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        });
        fetchDocuments();
        // Refresh application documents query
        if (ssn) {
          queryClient.invalidateQueries({ queryKey: ['ip-application-documents', ssn] });
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload "${file.name}"`);
      } finally {
        setUploading(prev => ({ ...prev, [slot.key]: false }));
        setTimeout(() => {
          setUploadProgress(prev => {
            const n = { ...prev };
            delete n[uploadKey];
            return n;
          });
        }, 2000);
      }
    }
    // Reset the input
    e.target.value = '';
  };

  const handleDeleteDocument = async (doc: UploadedDocument) => {
    try {
      await supabase.storage.from('ip-documents').remove([doc.file_path]);
      const { error } = await supabase.from('ip_documents').delete().eq('id', doc.id);
      if (error) throw error;

      // Also remove matching record from ip_application_documents by file_path
      if (ssn) {
        await supabase
          .from('ip_application_documents')
          .delete()
          .eq('ssn', ssn)
          .eq('file_path', doc.file_path);
        queryClient.invalidateQueries({ queryKey: ['ip-application-documents', ssn] });
      }

      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleDownloadDocument = async (doc: UploadedDocument) => {
    try {
      const { data, error } = await supabase.storage.from('ip-documents').download(doc.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.document_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const handleSelectChange = useCallback((field: string, value: string) => {
    onChange(field, value);
    clearError?.(field);
  }, [onChange, clearError]);

  // --- Application document handlers ---
  // Check if a URL points to local Supabase storage (ip-documents bucket)
  const isLocalStorageUrl = useCallback((url: string) => {
    return url.includes('/storage/v1/object/public/ip-documents/') || url.includes('/storage/v1/object/ip-documents/');
  }, []);

  // Extract file_path from a local storage URL
  const extractFilePath = useCallback((url: string) => {
    const marker = '/storage/v1/object/public/ip-documents/';
    const idx = url.indexOf(marker);
    if (idx >= 0) return decodeURIComponent(url.substring(idx + marker.length));
    return null;
  }, []);

  // Fetch blob: use direct storage download for local files, proxy for external
  const fetchDocBlob = useCallback(async (docUrl: string, fileName: string, action: 'stream' | 'download') => {
    // For local storage files, download directly via Supabase SDK
    if (isLocalStorageUrl(docUrl)) {
      const filePath = extractFilePath(docUrl);
      if (filePath) {
        const { data, error } = await supabase.storage.from('ip-documents').download(filePath);
        if (error) throw new Error(`Storage download failed: ${error.message}`);
        return data;
      }
    }

    // Fallback: use document-proxy for external URLs
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const proxyResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document-proxy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
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
    const category = getAppDocCategory(doc);
    const name = getAppDocName(doc, index);
    setLoadingDocId(doc.id);
    try {
      const blob = await fetchDocBlob(docUrl, name, 'stream');
      if (category === 'pdf') {
        const dataUrl = await blobToDataUrl(blob);
        window.open(dataUrl, '_blank');
      } else {
        const blobUrl = URL.createObjectURL(blob);
        setPreviewDoc({ url: blobUrl, name, category });
        setPreviewOpen(true);
      }
    } catch (err: any) {
      console.error('Document view error:', err);
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
      console.error('Document download error:', err);
      toast.error('Failed to download document', { description: err.message });
    } finally {
      setLoadingDocId(null);
    }
  }, [fetchDocBlob]);

  const handleClosePreview = useCallback(() => {
    if (previewDoc?.url) URL.revokeObjectURL(previewDoc.url);
    setPreviewOpen(false);
    setPreviewDoc(null);
  }, [previewDoc]);

  const handleTransferToDms = useCallback(async (doc: AppDoc) => {
    if (!ssn || !userCode) {
      toast.error('Cannot transfer', { description: 'User code or SSN not available' });
      return;
    }
    setTransferringDocId(doc.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dms-transfer-single`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ documentId: doc.id, ssn, userCode }),
        }
      );
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || `HTTP ${response.status}`);
      toast.success('Document transferred to DMS', { description: doc.document_name || doc.file_name || 'Document' });
      queryClient.invalidateQueries({ queryKey: ['ip-application-documents', ssn] });
      queryClient.invalidateQueries({ queryKey: ['dms-transfer-eligibility', ssn] });
    } catch (err: any) {
      console.error('DMS transfer error:', err);
      toast.error('DMS transfer failed', { description: err.message });
    } finally {
      setTransferringDocId(null);
    }
  }, [ssn, userCode, queryClient]);

  // Get documents for a specific upload slot (or its satisfying mandatory docs)
  const getDocsForSlot = (slot: typeof uploadSlots[0]) => {
    // If this supportive slot is satisfied by a mandatory upload, show those docs instead
    if (slot.satisfiedByMandatory && slot.satisfiedByCategoryId) {
      return documents.filter(d =>
        d.verification_category === slot.satisfiedByCategoryId && !d.is_supportive
      );
    }
    return documents.filter(d =>
      d.verification_category === slot.categoryId &&
      (slot.isSupportive ? d.is_supportive === true : !d.is_supportive)
    );
  };

  // --- RENDER ---

  const supportiveDocOptions = verifyTypes.filter(v => SUPPORTIVE_DOC_CODES.includes(v.code));

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              currentStep === 'selection'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            onClick={() => setCurrentStep('selection')}
          >
            <FileCheck className="h-4 w-4" />
            1. Document Selection
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              currentStep === 'upload'
                ? 'bg-primary text-primary-foreground'
                : canProceedToUpload
                  ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                  : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
            }`}
            onClick={() => { if (canProceedToUpload) setCurrentStep('upload'); }}
          >
            <Upload className="h-4 w-4" />
            2. Upload Documents
          </div>
        </div>

        {/* ===================== STEP 1: Document Selection ===================== */}
        {currentStep === 'selection' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Select Verification Documents</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Choose the document you will provide for each verification type. Fields marked with <span className="text-destructive font-medium">*</span> are mandatory.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {verificationCategories.map(cat => {
                const selectedCode = (formData as any)[cat.formField] || '';
                const needsSupportive = selectedCode && CODES_REQUIRING_SUPPORTIVE.includes(selectedCode);
                const hasError = errors[cat.formField] || selectionErrors[cat.formField];
                const supportiveError = selectionErrors[`${cat.id}_supportive`];

                return (
                  <Card key={cat.id} className={`border ${cat.isMandatory ? 'border-primary/30' : ''} ${hasError ? 'border-destructive' : ''}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={cat.formField} className="font-medium text-sm">
                          {cat.label}
                          {cat.isMandatory && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            {cat.tooltip}
                          </TooltipContent>
                        </Tooltip>
                        {cat.autoSelectCode && (
                          <Badge variant="secondary" className="text-xs ml-auto">Auto-selected</Badge>
                        )}
                      </div>

                      <Select
                        value={selectedCode || undefined}
                        onValueChange={(v) => {
                          handleSelectChange(cat.formField, v);
                          // Clear supportive if no longer needed
                          if (!CODES_REQUIRING_SUPPORTIVE.includes(v)) {
                            setSupportiveSelections(prev => {
                              const n = { ...prev };
                              delete n[cat.id];
                              return n;
                            });
                          }
                        }}
                        disabled={!isEditable || verifyLoading}
                      >
                        <SelectTrigger className={hasError ? 'border-destructive' : ''}>
                          <SelectValue placeholder={verifyLoading ? 'Loading...' : 'Select Document Type'} />
                        </SelectTrigger>
                        <SelectContent>
                          {verifyTypes.map(v => (
                            <SelectItem key={v.code} value={v.code}>
                              {v.description || v.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {hasError && <p className="text-xs text-destructive">{hasError}</p>}

                      {/* Supportive document requirement */}
                      {needsSupportive && (() => {
                        // Check if selected supportive doc is already satisfied by a mandatory upload
                        const supportiveCode = supportiveSelections[cat.id];
                        const matchingMandatory = supportiveCode
                          ? verificationCategories.find(other =>
                              other.id !== cat.id && (formData as any)[other.formField] === supportiveCode
                            )
                          : null;
                        const isSatisfied = matchingMandatory
                          ? documents.filter(d => d.verification_category === matchingMandatory.id && !d.is_supportive).length > 0
                          : false;

                        return (
                          <div className={`mt-2 p-3 rounded-md border space-y-2 ${isSatisfied ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-700' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'}`}>
                            <div className="flex items-center gap-2">
                              {isSatisfied ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                    Supportive document satisfied via mandatory upload
                                  </span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                    Supportive ID document required
                                  </span>
                                </>
                              )}
                            </div>
                            {!isSatisfied && (
                              <p className="text-xs text-amber-600 dark:text-amber-500">
                                {verifyTypes.find(v => v.code === selectedCode)?.description} requires an Identification Card or Identification Letter as supporting evidence.
                              </p>
                            )}
                            <Select
                              value={supportiveSelections[cat.id] || undefined}
                              onValueChange={(v) => setSupportiveSelections(prev => ({ ...prev, [cat.id]: v }))}
                              disabled={!isEditable}
                            >
                              <SelectTrigger className={`bg-background ${supportiveError && !isSatisfied ? 'border-destructive' : ''}`}>
                                <SelectValue placeholder="Select Supportive Document" />
                              </SelectTrigger>
                              <SelectContent>
                                {supportiveDocOptions.map(v => (
                                  <SelectItem key={v.code} value={v.code}>
                                    {v.description || v.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {supportiveError && !isSatisfied && <p className="text-xs text-destructive">{supportiveError}</p>}
                          </div>
                        );
                      })()}

                      {/* Show uploaded docs count for this category */}
                      {documents.filter(d => d.verification_category === cat.id).length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">
                            {documents.filter(d => d.verification_category === cat.id).length} file(s) uploaded
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Proceed button */}
            {isEditable && (
              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => {
                    if (!canProceedToUpload) {
                      toast.error('Please complete all mandatory selections', {
                        description: Object.values(selectionErrors)[0],
                      });
                      return;
                    }
                    setCurrentStep('upload');
                  }}
                  className="gap-2"
                >
                  Continue to Upload
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ===================== STEP 2: Upload Documents ===================== */}
        {currentStep === 'upload' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Upload Documents</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep('selection')} className="gap-1.5 text-muted-foreground">
                <ChevronLeft className="h-4 w-4" />
                Back to Selection
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload files for each selected document. Accepted formats: PDF, JPG, PNG, DOC, TIFF. Max 10MB per file.
            </p>

            <div className="space-y-4">
              {uploadSlots.map(slot => {
                const slotDocs = getDocsForSlot(slot);
                const isUploading = uploading[slot.key];

                return (
                  <Card key={slot.key} className={`${slot.isSupportive ? 'ml-6' : ''} ${slot.satisfiedByMandatory ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20' : slot.isSupportive ? 'border-amber-200 dark:border-amber-800' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {slot.satisfiedByMandatory ? (
                            <Badge variant="outline" className="text-xs border-emerald-400 text-emerald-700 dark:text-emerald-400 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Satisfied via Mandatory
                            </Badge>
                          ) : slot.isSupportive ? (
                            <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-400">
                              Supportive
                            </Badge>
                          ) : null}
                          <span className="font-medium text-sm">{slot.label}</span>
                        </div>
                        {isEditable && !slot.satisfiedByMandatory && (
                          <label className="cursor-pointer">
                            <Input
                              type="file"
                              className="hidden"
                              accept={ACCEPTED_TYPES.join(',')}
                              multiple
                              onChange={(e) => handleFileUpload(e, slot)}
                              disabled={isUploading}
                            />
                            <Button variant="outline" size="sm" asChild disabled={isUploading}>
                              <span>
                                {isUploading ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4 mr-2" />
                                )}
                                {isUploading ? 'Uploading...' : 'Upload'}
                              </span>
                            </Button>
                          </label>
                        )}
                      </div>

                      {/* Satisfied by mandatory message */}
                      {slot.satisfiedByMandatory && (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-100/50 dark:bg-emerald-900/20 mb-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">
                            This requirement is already satisfied by the mandatory document upload of the same type. No additional upload needed.
                          </p>
                        </div>
                      )}

                      {/* Upload progress */}
                      {Object.entries(uploadProgress)
                        .filter(([key]) => key.startsWith(slot.key))
                        .map(([key, progress]) => (
                          <div key={key} className="mb-2">
                            <Progress value={progress} className="h-1.5" />
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {progress < 100 ? `Uploading... ${progress}%` : 'Complete'}
                            </p>
                          </div>
                        ))
                      }

                      {/* Uploaded files for this slot */}
                      {slotDocs.length > 0 ? (
                        <div className="space-y-2">
                          {slotDocs.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                              <div className="flex items-center gap-2 min-w-0">
                                <File className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{doc.document_name}</p>
                                  <p className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</p>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadDocument(doc)}>
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                                {isEditable && !slot.satisfiedByMandatory && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteDocument(doc)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No files uploaded yet</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {uploadSlots.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No documents selected</p>
                  <p className="text-sm mt-1">Go back to Document Selection to choose which documents to upload.</p>
                </div>
              )}
            </div>

            {/* Legacy uploaded documents without category */}
            {documents.filter(d => !d.verification_category).length > 0 && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Previously Uploaded Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {documents.filter(d => !d.verification_category).map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{doc.document_name}</p>
                            <p className="text-xs text-muted-foreground">{doc.document_type} • {formatSize(doc.file_size)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadDocument(doc)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          {isEditable && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteDocument(doc)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ===================== Application Documents (SSN-linked) ===================== */}
        {ssn && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Application Documents
                <Badge variant="secondary">{appDocs.length}</Badge>
              </CardTitle>
              <CardDescription>
                Documents submitted with the online application for SSN: {ssn}
              </CardDescription>
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
                      return (
                        <TableRow key={doc.id}>
                          <TableCell>{getAppDocFileIcon(doc)}</TableCell>
                          <TableCell className="font-medium">{getAppDocName(doc, index)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{doc.document_type || 'Unknown'}</Badge>
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
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No file available</span>
                              )}
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

        {/* Document Preview Modal */}
        <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) handleClosePreview(); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{previewDoc?.name || 'Document Preview'}</DialogTitle>
              <DialogDescription>Secure document preview</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-auto">
              {previewDoc?.category === 'pdf' && (
                <object data={previewDoc.url} type="application/pdf" className="w-full h-[70vh] border rounded-lg" title={previewDoc.name}>
                  <iframe src={previewDoc.url} className="w-full h-[70vh] border rounded-lg" title={previewDoc.name} />
                </object>
              )}
              {previewDoc?.category === 'image' && (
                <div className="flex items-center justify-center p-4">
                  <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md" />
                </div>
              )}
              {previewDoc?.category === 'other' && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mb-4 text-destructive" />
                  <p className="font-medium text-lg">Preview not available</p>
                  <p className="text-sm mt-1 mb-4">This file format cannot be previewed in the browser.</p>
                  <Button variant="default" onClick={() => {
                    if (previewDoc.url) {
                      const link = document.createElement('a');
                      link.href = previewDoc.url;
                      link.download = previewDoc.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download Instead
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
