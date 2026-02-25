import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import {
  Upload, File, Trash2, Download, FileText, Eye, Image as ImageIcon,
  AlertTriangle, Loader2, CheckCircle2, Info, ChevronRight, ChevronLeft,
  ShieldCheck, FileCheck, X, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useVerifyTypes } from '@/hooks/useIPMasterLookups';
import { useDocumentTypeResolver } from '@/hooks/useDocumentTypeResolver';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useUserCode } from '@/hooks/useUserCode';

// --- Interfaces ---

interface MeetingDocumentVerificationTabProps {
  applicationData: Record<string, any>;
  meetingId: string;
  applicationReference: string;
  isEditable: boolean;
  /** Callback reporting verification categories that have active platform replacements */
  onReplacedCategoriesChange?: (replacedCategories: Set<string>) => void;
}

interface UnifiedDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  verification_category?: string | null;
  supportive_doc_type?: string | null;
  is_supportive?: boolean;
  source: 'external' | 'platform';
  url?: string;
  doc_code?: string | null;
  is_active?: boolean;
}

interface VerificationCategory {
  id: string;
  label: string;
  fieldKey: string;
  isMandatory: boolean;
  tooltip: string;
  autoSelectCode?: string;
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

const CATEGORY_TO_VERIFY_TYPE: Record<string, string> = {
  birth: 'birth_status',
  name: 'name_status',
  marital: 'marital_status',
  death: 'death_status',
};

// --- Helpers ---
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

const VERIFY_TYPE_TO_CATEGORY: Record<string, string> = {
  birth_status: 'birth',
  name_status: 'name',
  marital_status: 'marital',
  death_status: 'death',
};

function mapExternalDocs(apiDocs: any[]): UnifiedDocument[] {
  if (!apiDocs || !Array.isArray(apiDocs)) return [];
  return apiDocs.map((d, idx) => ({
    id: d.id || `ext-${idx}`,
    document_type: d.documentType || d.type || d.verificationType || d.document_type || '',
    document_name: d.fileName || d.name || d.file_name || d.document_name || 'Unknown',
    file_path: d.filePath || d.file_path || '',
    file_size: typeof d.fileSize === 'number' ? d.fileSize : (parseInt(d.fileSize, 10) || 0),
    uploaded_at: d.uploadedAt || d.uploaded_at || '',
    verification_category: VERIFY_TYPE_TO_CATEGORY[d.verificationType as string] || null,
    supportive_doc_type: null,
    is_supportive: false,
    source: 'external' as const,
    url: d.signedUrl || d.url || d.filePath || '',
    doc_code: d.documentType || null,
    is_active: true,
  }));
}

function mapPlatformDocs(rows: any[]): UnifiedDocument[] {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(d => ({
    id: d.id,
    document_type: d.document_type || d.document_name || '',
    document_name: d.file_name || d.document_name || '',
    file_path: d.file_path || '',
    file_size: d.file_size || 0,
    uploaded_at: d.created_at || '',
    verification_category: d.verification_category || null,
    supportive_doc_type: d.supportive_doc_type || null,
    is_supportive: d.is_supportive ?? false,
    source: 'platform' as const,
    url: d.storage_url || '',
    doc_code: d.doc_code || null,
    is_active: d.is_active ?? true,
  }));
}

function mergeDocuments(externalDocs: UnifiedDocument[], platformDocs: UnifiedDocument[]): UnifiedDocument[] {
  // Determine which verification categories have active platform replacements
  const platformReplacedCategories = new Set<string>();
  for (const doc of platformDocs) {
    if (doc.is_active && doc.verification_category && !doc.is_supportive) {
      platformReplacedCategories.add(doc.verification_category);
    }
  }

  const seen = new Set<string>();
  const result: UnifiedDocument[] = [];

  // Add external docs, but skip categories that have active platform replacements
  for (const doc of externalDocs) {
    const key = doc.url || doc.file_path || doc.id;
    if (key && !seen.has(key)) {
      // If this external doc's category has been replaced by a platform doc, exclude it
      if (doc.verification_category && platformReplacedCategories.has(doc.verification_category)) {
        continue;
      }
      seen.add(key);
      result.push(doc);
    }
  }

  for (const doc of platformDocs) {
    const key = doc.url || doc.file_path || doc.id;
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(doc);
    }
  }

  return result;
}

export function MeetingDocumentVerificationTab({
  applicationData,
  meetingId,
  applicationReference,
  isEditable,
  onReplacedCategoriesChange,
}: MeetingDocumentVerificationTabProps) {
  const { user } = useAuth();
  const { userCode } = useUserCode();
  const { resolveDocType } = useDocumentTypeResolver();
  const queryClient = useQueryClient();

  const [verifySelections, setVerifySelections] = useState<Record<string, string>>({});
  const [supportiveSelections, setSupportiveSelections] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<UnifiedDocument[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<'selection' | 'upload'>('selection');

  // Track previous selections to detect user-initiated changes
  const prevSelectionsRef = useRef<Record<string, string>>({});
  // Track categories where doc type was changed and re-upload is needed
  const [pendingReupload, setPendingReupload] = useState<Record<string, string>>({});

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; category: 'pdf' | 'image' | 'other' } | null>(null);

  const { data: verifyTypes = [], isLoading: verifyLoading } = useVerifyTypes();

  const maritalStatus = applicationData?.maritalStatus || '';
  const isMarried = ['Married', 'M', 'Common Law', 'C'].includes(maritalStatus);

  const hasDeathInfo = useMemo(() => {
    const deps = applicationData?.dependants || [];
    return deps.some((d: any) => !!d.dateOfDeath);
  }, [applicationData?.dependants]);

  const verificationCategories = useMemo((): VerificationCategory[] => {
    const categories: VerificationCategory[] = [];

    categories.push({
      id: 'birth',
      label: 'Birth Status Verification',
      fieldKey: 'birth_doc_type',
      isMandatory: true,
      tooltip: 'Select the document that verifies the applicant\'s birth. Birth Certificate or Baptism Certificate require an additional supportive ID document.',
    });

    categories.push({
      id: 'name',
      label: 'Name Status Verification',
      fieldKey: 'name_doc_type',
      isMandatory: true,
      tooltip: 'Select the document that verifies the applicant\'s legal name. Required for all registrations.',
    });

    categories.push({
      id: 'marital',
      label: 'Marital Status Verification',
      fieldKey: 'marital_doc_type',
      isMandatory: isMarried,
      tooltip: isMarried
        ? 'Marriage Certificate is required because the applicant declared a married or common law status.'
        : 'Optional. Select a document if you want to verify marital status.',
      autoSelectCode: isMarried ? 'M' : undefined,
    });

    categories.push({
      id: 'death',
      label: 'Death Status Verification',
      fieldKey: 'death_doc_type',
      isMandatory: hasDeathInfo,
      tooltip: hasDeathInfo
        ? 'Certificate of Death is required because death information has been indicated.'
        : 'Optional. Select if the insured person is deceased.',
      autoSelectCode: hasDeathInfo ? 'C' : undefined,
    });

    return categories;
  }, [isMarried, hasDeathInfo]);

  // Build API doc field keys from external documents
  const apiDocFieldKeys = useMemo(() => {
    const verTypeToFieldKey: Record<string, string> = {
      birth_status: 'birth_doc_type',
      name_status: 'name_doc_type',
      marital_status: 'marital_doc_type',
      death_status: 'death_doc_type',
    };
    const map: Record<string, string> = {};
    const apiDocs = applicationData?.documents;
    if (apiDocs && Array.isArray(apiDocs)) {
      for (const doc of apiDocs) {
        const vt = doc.verificationType as string | undefined;
        const dt = doc.documentType as string | undefined;
        if (vt && dt && verTypeToFieldKey[vt]) {
          map[verTypeToFieldKey[vt]] = dt;
        }
      }
    }
    return map;
  }, [applicationData?.documents]);

  // Track platform-derived overrides (set after fetching documents)
  const [platformOverrides, setPlatformOverrides] = useState<Record<string, string>>({});

  // Auto-select from external API documents first, but platform overrides win
  useEffect(() => {
    if (Object.keys(apiDocFieldKeys).length === 0 && Object.keys(platformOverrides).length === 0) return;
    setVerifySelections(prev => {
      const next = { ...prev };
      // Set from external API first
      for (const [fieldKey, code] of Object.entries(apiDocFieldKeys)) {
        next[fieldKey] = code;
      }
      // Then override with platform replacement doc_codes (platform wins)
      for (const [fieldKey, code] of Object.entries(platformOverrides)) {
        next[fieldKey] = code;
      }
      return next;
    });
  }, [apiDocFieldKeys, platformOverrides]);

  // Auto-select from category autoSelectCode — only if no API doc exists
  useEffect(() => {
    verificationCategories.forEach(cat => {
      if (cat.autoSelectCode && !apiDocFieldKeys[cat.fieldKey] && !verifySelections[cat.fieldKey]) {
        setVerifySelections(prev => ({ ...prev, [cat.fieldKey]: cat.autoSelectCode! }));
      }
    });
  }, [verificationCategories, apiDocFieldKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync prevSelectionsRef after initial load stabilizes
  useEffect(() => {
    const keys = Object.keys(verifySelections);
    if (keys.length > 0 && Object.keys(prevSelectionsRef.current).length === 0) {
      prevSelectionsRef.current = { ...verifySelections };
    }
  }, [verifySelections]);

  // Only show active documents everywhere
  const activeDocuments = useMemo(() => documents.filter(d => d.is_active !== false), [documents]);

  // Report which verification categories have platform replacements to parent
  useEffect(() => {
    if (!onReplacedCategoriesChange) return;
    const platformCategories = new Set<string>();
    for (const doc of activeDocuments) {
      if (doc.source === 'platform' && doc.verification_category) {
        platformCategories.add(doc.verification_category);
      }
    }
    onReplacedCategoriesChange(platformCategories);
  }, [activeDocuments, onReplacedCategoriesChange]);

  const getRequiresSupportive = useCallback((categoryId: string): boolean => {
    const cat = verificationCategories.find(c => c.id === categoryId);
    if (!cat) return false;
    const selectedCode = verifySelections[cat.fieldKey];
    return !!selectedCode && CODES_REQUIRING_SUPPORTIVE.includes(selectedCode);
  }, [verifySelections, verificationCategories]);

  // --- Deactivate old documents when dropdown changes ---
  const deactivateDocsForCategory = useCallback(async (categoryId: string, isSupportive: boolean) => {
    // Deactivate platform docs in DB
    try {
      const { error } = await supabase
        .from('meeting_uploaded_documents')
        .update({
          is_active: false,
          replaced_at: new Date().toISOString(),
        } as any)
        .eq('meeting_id', meetingId)
        .eq('application_reference', applicationReference)
        .eq('verification_category', categoryId)
        .eq('is_supportive', isSupportive)
        .eq('is_active', true);

      if (error) {
        console.error('Failed to deactivate documents:', error);
      }
    } catch (err) {
      console.error('Error deactivating documents:', err);
    }
  }, [meetingId, applicationReference]);

  // Handle dropdown change — deactivate old docs and mark re-upload needed
  const handleVerificationChange = useCallback(async (cat: VerificationCategory, newCode: string) => {
    const oldCode = verifySelections[cat.fieldKey];

    // Update selection
    setVerifySelections(prev => ({ ...prev, [cat.fieldKey]: newCode }));

    // Clear supportive selection if new code doesn't need it
    if (!CODES_REQUIRING_SUPPORTIVE.includes(newCode)) {
      setSupportiveSelections(prev => {
        const n = { ...prev };
        delete n[cat.id];
        return n;
      });
    }

    // If code actually changed from a previous value, deactivate old docs
    if (oldCode && oldCode !== newCode) {
      // Deactivate main docs for this category
      await deactivateDocsForCategory(cat.id, false);
      // Also deactivate supportive docs since the requirement changed
      await deactivateDocsForCategory(cat.id, true);

      // Mark this category as needing re-upload
      setPendingReupload(prev => ({ ...prev, [cat.id]: newCode }));

      // Re-fetch documents to reflect deactivation
      fetchDocuments();

      const verifyItem = verifyTypes.find(v => v.code === newCode);
      toast.info(`Document type changed to ${verifyItem?.description || newCode}`, {
        description: `Previous document has been deactivated. Please upload a new ${verifyItem?.description || newCode} in the Upload Documents section.`,
      });
    }

    prevSelectionsRef.current[cat.fieldKey] = newCode;
  }, [verifySelections, deactivateDocsForCategory, verifyTypes]);

  // Upload slots computation
  const uploadSlots = useMemo(() => {
    const slots: Array<{
      key: string;
      label: string;
      categoryId: string;
      isSupportive: boolean;
      docCode: string;
      docDescription: string;
      satisfiedByMandatory?: boolean;
      satisfiedByCategoryId?: string;
      needsReupload?: boolean;
    }> = [];

    const mandatorySlots: Array<{ categoryId: string; docCode: string; docDescription: string }> = [];

    verificationCategories.forEach(cat => {
      const selectedCode = verifySelections[cat.fieldKey];
      if (!selectedCode) return;

      const verifyItem = verifyTypes.find(v => v.code === selectedCode);
      const desc = verifyItem?.description || selectedCode;
      mandatorySlots.push({ categoryId: cat.id, docCode: selectedCode, docDescription: desc });

      // Check if this category has pending re-upload (changed doc type, no active docs with new code)
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

    // Add supportive slots
    verificationCategories.forEach(cat => {
      const selectedCode = verifySelections[cat.fieldKey];
      if (!selectedCode || !CODES_REQUIRING_SUPPORTIVE.includes(selectedCode)) return;

      const supportiveCode = supportiveSelections[cat.id];
      if (!supportiveCode) return;

      const supportiveItem = verifyTypes.find(v => v.code === supportiveCode);
      const supportiveDesc = supportiveItem?.description || supportiveCode;

      const matchingMandatory = mandatorySlots.find(
        m => m.docCode === supportiveCode && m.categoryId !== cat.id
      );
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

  // Validation errors
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

  // Upload validation: check that active docs exist for each mandatory selection
  const uploadErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    verificationCategories.forEach(cat => {
      const selectedCode = verifySelections[cat.fieldKey];
      if (!selectedCode) return;
      if (!cat.isMandatory && !selectedCode) return;

      // Check for active primary doc for this category
      const hasActivePrimaryDoc = activeDocuments.some(
        d => d.verification_category === cat.id && !d.is_supportive
      );
      if (!hasActivePrimaryDoc && selectedCode) {
        const desc = verifyTypes.find(v => v.code === selectedCode)?.description || selectedCode;
        errs[`${cat.id}_main`] = `Upload required: ${desc}`;
      }

      // Check supportive requirement
      if (CODES_REQUIRING_SUPPORTIVE.includes(selectedCode)) {
        const supportiveCode = supportiveSelections[cat.id];
        if (supportiveCode) {
          // Check if satisfied by mandatory
          const matchingMandatory = verificationCategories.find(
            other => other.id !== cat.id && verifySelections[other.fieldKey] === supportiveCode
          );
          const mandatoryDocs = matchingMandatory
            ? activeDocuments.filter(d => d.verification_category === matchingMandatory.id && !d.is_supportive)
            : [];
          const isSatisfied = mandatoryDocs.length > 0;

          if (!isSatisfied) {
            const hasActiveSupportiveDoc = activeDocuments.some(
              d => d.verification_category === cat.id && d.is_supportive
            );
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

  // --- Document fetching ---
  const fetchDocuments = useCallback(async () => {
    try {
      const externalDocs = mapExternalDocs(applicationData?.documents || []);

      const { data: platformRows, error } = await supabase
        .from('meeting_uploaded_documents')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('application_reference', applicationReference)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching platform documents:', error);
      }

      const platformDocs = mapPlatformDocs(platformRows || []);
      const merged = mergeDocuments(externalDocs, platformDocs);
      setDocuments(merged);

      // Derive dropdown overrides from active platform replacement docs
      const categoryFieldKeyMap: Record<string, string> = {
        birth: 'birth_doc_type',
        name: 'name_doc_type',
        marital: 'marital_doc_type',
        death: 'death_doc_type',
      };
      const overrides: Record<string, string> = {};
      for (const doc of platformDocs) {
        if (doc.is_active && doc.verification_category && !doc.is_supportive && doc.doc_code) {
          const fieldKey = categoryFieldKeyMap[doc.verification_category];
          if (fieldKey) {
            overrides[fieldKey] = doc.doc_code;
          }
        }
      }
      setPlatformOverrides(overrides);

      // Clear pending re-upload flags if active docs now exist
      setPendingReupload(prev => {
        const next = { ...prev };
        for (const [catId, code] of Object.entries(prev)) {
          const hasActive = merged.some(
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
  }, [applicationData?.documents, meetingId, applicationReference]);

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
        // First, deactivate any existing active docs for this slot to enforce single active primary
        await deactivateDocsForCategory(slot.categoryId, slot.isSupportive);

        const fileExt = file.name.split('.').pop();
        const fileName = `meeting_${meetingId}/${slot.categoryId}_${slot.isSupportive ? 'supportive_' : ''}${Date.now()}.${fileExt}`;

        setUploadProgress(prev => ({ ...prev, [uploadKey]: 40 }));

        const { error: uploadError } = await supabase.storage
          .from('ip-documents')
          .upload(fileName, file);
        if (uploadError) throw uploadError;

        setUploadProgress(prev => ({ ...prev, [uploadKey]: 60 }));

        const { data: urlData } = supabase.storage
          .from('ip-documents')
          .getPublicUrl(fileName);
        const publicUrl = urlData?.publicUrl || '';

        setUploadProgress(prev => ({ ...prev, [uploadKey]: 75 }));

        const { error: dbError } = await supabase
          .from('meeting_uploaded_documents')
          .insert({
            meeting_id: meetingId,
            application_reference: applicationReference,
            document_type: slot.isSupportive ? 'supportive' : 'mandatory',
            document_name: slot.docDescription,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            storage_url: publicUrl,
            verification_category: slot.categoryId,
            is_supportive: slot.isSupportive,
            supportive_doc_type: slot.isSupportive ? slot.docCode : null,
            doc_code: slot.docCode,
            is_active: true,
            uploaded_by: user?.id,
            uploaded_by_code: userCode || null,
            metadata: {
              meeting_id: meetingId,
              application_reference: applicationReference,
              verification_type: CATEGORY_TO_VERIFY_TYPE[slot.categoryId] || null,
              doc_code: slot.docCode,
            },
          });
        if (dbError) throw dbError;

        setUploadProgress(prev => ({ ...prev, [uploadKey]: 100 }));
        toast.success(`"${file.name}" uploaded successfully`, {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        });

        // Clear pending re-upload for this category
        setPendingReupload(prev => {
          const next = { ...prev };
          delete next[slot.categoryId];
          return next;
        });

        fetchDocuments();
        queryClient.invalidateQueries({ queryKey: ['meeting-uploaded-documents', meetingId] });
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
    e.target.value = '';
  };

  const handleDeleteDocument = async (doc: UnifiedDocument) => {
    if (doc.source === 'external') {
      toast.error('External API documents cannot be deleted from this screen');
      return;
    }
    try {
      if (doc.file_path) {
        await supabase.storage.from('ip-documents').remove([doc.file_path]);
      }
      const { error } = await supabase.from('meeting_uploaded_documents').delete().eq('id', doc.id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['meeting-uploaded-documents', meetingId] });
      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleDownloadDocument = async (doc: UnifiedDocument) => {
    try {
      if (doc.source === 'platform' && doc.file_path) {
        const { data, error } = await supabase.storage.from('ip-documents').download(doc.file_path);
        if (error) throw error;
        const url = URL.createObjectURL(data);
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
  };

  const handleViewDocument = async (doc: UnifiedDocument) => {
    try {
      if (doc.source === 'platform' && doc.file_path) {
        const { data, error } = await supabase.storage.from('ip-documents').download(doc.file_path);
        if (error) throw error;
        const blobUrl = URL.createObjectURL(data);
        const ext = doc.document_name.toLowerCase();
        const category: 'pdf' | 'image' | 'other' =
          ext.endsWith('.pdf') || data.type.includes('pdf') ? 'pdf' :
          data.type.includes('image') ? 'image' : 'other';

        if (category === 'pdf') {
          const reader = new FileReader();
          reader.onloadend = () => {
            window.open(reader.result as string, '_blank');
            URL.revokeObjectURL(blobUrl);
          };
          reader.readAsDataURL(data);
        } else {
          setPreviewDoc({ url: blobUrl, name: doc.document_name, category });
          setPreviewOpen(true);
        }
      } else if (doc.url) {
        const ext = (doc.document_name || doc.url).toLowerCase();
        const category: 'pdf' | 'image' | 'other' =
          ext.includes('.pdf') ? 'pdf' :
          ext.includes('.jpg') || ext.includes('.jpeg') || ext.includes('.png') ? 'image' : 'other';
        
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
  };

  const handleClosePreview = useCallback(() => {
    if (previewDoc?.url && previewDoc.url.startsWith('blob:')) URL.revokeObjectURL(previewDoc.url);
    setPreviewOpen(false);
    setPreviewDoc(null);
  }, [previewDoc]);

  const getDocsForSlot = (slot: typeof uploadSlots[0]) => {
    if (slot.satisfiedByMandatory && slot.satisfiedByCategoryId) {
      return activeDocuments.filter(d =>
        d.verification_category === slot.satisfiedByCategoryId && !d.is_supportive
      );
    }
    const categoryDocs = activeDocuments.filter(d =>
      d.verification_category === slot.categoryId &&
      (slot.isSupportive ? d.is_supportive === true : !d.is_supportive)
    );
    // If platform docs exist for this slot, hide external API docs (platform replaces external)
    const hasPlatformDoc = categoryDocs.some(d => d.source === 'platform');
    if (hasPlatformDoc) {
      return categoryDocs.filter(d => d.source === 'platform');
    }
    return categoryDocs;
  };

  const supportiveDocOptions = verifyTypes.filter(v => SUPPORTIVE_DOC_CODES.includes(v.code));

  // --- RENDER ---
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
              Changing a selection will deactivate previously uploaded documents for that verification.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {verificationCategories.map(cat => {
                const selectedCode = verifySelections[cat.fieldKey] || '';
                const needsSupportive = selectedCode && CODES_REQUIRING_SUPPORTIVE.includes(selectedCode);
                const hasError = selectionErrors[cat.fieldKey];
                const supportiveError = selectionErrors[`${cat.id}_supportive`];
                const hasPendingReupload = !!pendingReupload[cat.id];

                return (
                  <Card key={cat.id} className={`border ${cat.isMandatory ? 'border-primary/30' : ''} ${hasError ? 'border-destructive' : ''} ${hasPendingReupload ? 'border-amber-400' : ''}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={cat.fieldKey} className="font-medium text-sm">
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
                        {cat.autoSelectCode && !apiDocFieldKeys[cat.fieldKey] && !platformOverrides[cat.fieldKey] && !hasPendingReupload && (
                          <Badge variant="secondary" className="text-xs ml-auto">Auto-selected</Badge>
                        )}
                        {platformOverrides[cat.fieldKey] && !hasPendingReupload && (
                          <Badge variant="outline" className="text-xs ml-auto border-blue-400 text-blue-700 dark:text-blue-400">Replaced</Badge>
                        )}
                        {apiDocFieldKeys[cat.fieldKey] && !platformOverrides[cat.fieldKey] && !hasPendingReupload && (
                          <Badge variant="outline" className="text-xs ml-auto border-emerald-400 text-emerald-700 dark:text-emerald-400">From Document</Badge>
                        )}
                        {hasPendingReupload && (
                          <Badge variant="outline" className="text-xs ml-auto border-amber-400 text-amber-700 dark:text-amber-400 gap-1">
                            <RefreshCw className="h-3 w-3" />
                            Re-upload needed
                          </Badge>
                        )}
                      </div>

                      <Select
                        value={selectedCode || undefined}
                        onValueChange={(v) => handleVerificationChange(cat, v)}
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

                      {/* Re-upload warning */}
                      {hasPendingReupload && (
                        <div className="p-2.5 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                              Previous document deactivated. Upload a new {verifyTypes.find(v => v.code === pendingReupload[cat.id])?.description || pendingReupload[cat.id]} in the Upload Documents section.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Supportive document requirement */}
                      {needsSupportive && (() => {
                        const supportiveCode = supportiveSelections[cat.id];
                        const matchingMandatory = supportiveCode
                          ? verificationCategories.find(other =>
                              other.id !== cat.id && verifySelections[other.fieldKey] === supportiveCode
                            )
                          : null;
                        const isSatisfied = matchingMandatory
                          ? activeDocuments.filter(d => d.verification_category === matchingMandatory.id && !d.is_supportive).length > 0
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

                      {/* Show uploaded docs count */}
                      {activeDocuments.filter(d => d.verification_category === cat.id).length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">
                            {activeDocuments.filter(d => d.verification_category === cat.id).length} active file(s)
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

            {/* Upload errors summary */}
            {Object.keys(uploadErrors).length > 0 && (
              <div className="p-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {Object.keys(uploadErrors).length} document(s) still need to be uploaded
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {Object.values(uploadErrors).map((msg, i) => (
                    <li key={i} className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1">
                      <span className="mt-0.5">•</span> {msg}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              {uploadSlots.map(slot => {
                const slotDocs = getDocsForSlot(slot);
                const isUploading = uploading[slot.key];
                const slotUploadError = uploadErrors[slot.key];

                return (
                  <Card key={slot.key} className={`${slot.isSupportive ? 'ml-6' : ''} ${slot.satisfiedByMandatory ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20' : slot.isSupportive ? 'border-amber-200 dark:border-amber-800' : ''} ${slot.needsReupload ? 'border-amber-400 dark:border-amber-600' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {slot.satisfiedByMandatory ? (
                            <Badge variant="outline" className="text-xs border-emerald-400 text-emerald-700 dark:text-emerald-400 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Satisfied via Mandatory
                            </Badge>
                          ) : slot.needsReupload ? (
                            <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 dark:text-amber-400 gap-1">
                              <RefreshCw className="h-3 w-3" />
                              Re-upload Required
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

                      {/* Re-upload needed message */}
                      {slot.needsReupload && (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 mb-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            The document type was changed. The previous document has been deactivated. Please upload a new <strong>{slot.docDescription}</strong>.
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

                      {/* Uploaded files */}
                      {slotDocs.length > 0 ? (
                        <div className="space-y-2">
                          {slotDocs.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                              <div className="flex items-center gap-2 min-w-0">
                                <File className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-medium truncate">{doc.document_name}</p>
                                    {doc.document_type && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary cursor-help shrink-0">
                                            <Info className="h-2.5 w-2.5" />
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">
                                          {resolveDocType(doc.document_type)}
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</p>
                                    {doc.source === 'external' && (
                                      <Badge variant="outline" className="text-[10px] px-1 py-0">External</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDocument(doc)} title="View">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadDocument(doc)} title="Download">
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                                {isEditable && !slot.satisfiedByMandatory && doc.source === 'platform' && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteDocument(doc)} title="Delete">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground italic">No files uploaded yet</p>
                          {slotUploadError && (
                            <Badge variant="destructive" className="text-[10px]">Required</Badge>
                          )}
                        </div>
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

            {/* External API documents without a verification category */}
            {activeDocuments.filter(d => !d.verification_category && d.source === 'external').length > 0 && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Application Documents (from External API)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activeDocuments.filter(d => !d.verification_category && d.source === 'external').map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate">{doc.document_name}</p>
                              {doc.document_type && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary cursor-help shrink-0">
                                      <Info className="h-2.5 w-2.5" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {resolveDocType(doc.document_type)}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</p>
                              <Badge variant="outline" className="text-[10px] px-1 py-0">External</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDocument(doc)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadDocument(doc)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Legacy platform docs without category */}
            {activeDocuments.filter(d => !d.verification_category && d.source === 'platform').length > 0 && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Previously Uploaded Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activeDocuments.filter(d => !d.verification_category && d.source === 'platform').map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate">{doc.document_name}</p>
                              {doc.document_type && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary cursor-help shrink-0">
                                      <Info className="h-2.5 w-2.5" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {resolveDocType(doc.document_type)}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDocument(doc)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
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
