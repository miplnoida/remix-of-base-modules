import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Upload, Eye, Download, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logAuditTrail } from '@/services/auditService';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ACCEPTED_TYPES, MAX_FILE_SIZE } from '@/components/documents/shared/types';

interface MergedDocument {
  id: string;
  document_type: string;
  file_name: string;
  uploaded_at: string;
  source: 'external' | 'platform';
  url?: string;
  file_path?: string;
  doc_code?: string;
  file_size?: number;
  mime_type?: string;
  is_active?: boolean;
}

interface EmployerMeetingDocumentsTabProps {
  documents: any[];
  meetingId: string;
  applicationReference: string;
}

export function EmployerMeetingDocumentsTab({ documents, meetingId, applicationReference }: EmployerMeetingDocumentsTabProps) {
  const { user } = useAuth();
  const { userCode } = useUserCode();
  const [mergedDocs, setMergedDocs] = useState<MergedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const fetchAndMerge = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch platform uploads for this meeting
      const { data: platformDocs, error } = await supabase
        .from('meeting_uploaded_documents')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('application_reference', applicationReference)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching meeting documents:', error);

      const platformMap = new Map<string, any>();
      (platformDocs || []).forEach((doc: any) => {
        const key = doc.document_type || doc.doc_code || '';
        if (key && !platformMap.has(key)) {
          platformMap.set(key, doc);
        }
      });

      // Map external docs and merge with platform overrides
      const externalDocs: MergedDocument[] = (documents || []).map((doc: any, idx: number) => {
        const docType = doc.document_type || doc.type || doc.documentType || `doc-${idx}`;
        const platformOverride = platformMap.get(docType) || platformMap.get(doc.doc_code);

        if (platformOverride) {
          platformMap.delete(docType);
          if (doc.doc_code) platformMap.delete(doc.doc_code);
          return {
            id: platformOverride.id,
            document_type: docType,
            file_name: platformOverride.file_name || platformOverride.document_name,
            uploaded_at: platformOverride.created_at,
            source: 'platform' as const,
            url: platformOverride.storage_url,
            file_path: platformOverride.file_path,
            doc_code: platformOverride.doc_code || doc.doc_code,
            file_size: platformOverride.file_size,
            mime_type: platformOverride.mime_type,
            is_active: true,
          };
        }

        return {
          id: doc.id || `ext-${idx}`,
          document_type: docType,
          file_name: doc.file_name || doc.name || doc.fileName || 'Document',
          uploaded_at: doc.uploaded_at || doc.uploadedAt || '',
          source: 'external' as const,
          url: doc.download_url || doc.url || doc.signed_url || '',
          file_path: doc.file_path || '',
          doc_code: doc.doc_code,
          file_size: doc.file_size || doc.fileSize,
          mime_type: doc.mime_type || doc.mimeType,
          is_active: true,
        };
      });

      // Add any remaining platform docs not matched to external docs
      platformMap.forEach((doc) => {
        externalDocs.push({
          id: doc.id,
          document_type: doc.document_type || doc.document_name,
          file_name: doc.file_name || doc.document_name,
          uploaded_at: doc.created_at,
          source: 'platform' as const,
          url: doc.storage_url,
          file_path: doc.file_path,
          doc_code: doc.doc_code,
          file_size: doc.file_size,
          mime_type: doc.mime_type,
          is_active: true,
        });
      });

      setMergedDocs(externalDocs);
    } catch (err) {
      console.error('Error merging documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, applicationReference, documents]);

  useEffect(() => {
    if (meetingId && applicationReference) {
      fetchAndMerge();
    }
  }, [fetchAndMerge]);

  const handleUploadClick = (idx: number) => {
    fileInputRefs.current[idx]?.click();
  };

  const handleFileChange = async (idx: number, file: File | undefined) => {
    if (!file) return;

    // Validate file
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) {
      toast.error(`File type ${ext} is not allowed. Accepted: ${ACCEPTED_TYPES.join(', ')}`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    setUploadingIdx(idx);
    const doc = mergedDocs[idx];

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const storagePath = `meeting_${meetingId}/${doc.document_type}_${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from('employer-documents')
        .upload(storagePath, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('employer-documents')
        .getPublicUrl(storagePath);
      const publicUrl = urlData?.publicUrl || '';

      // Deactivate previous uploads for this doc type in this meeting
      await supabase
        .from('meeting_uploaded_documents')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('meeting_id', meetingId)
        .eq('application_reference', applicationReference)
        .eq('document_type', doc.document_type)
        .eq('is_active', true);

      // Insert new record
      const { error: insertErr } = await supabase.from('meeting_uploaded_documents').insert({
        meeting_id: meetingId,
        application_reference: applicationReference,
        document_type: doc.document_type,
        document_name: doc.document_type,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        storage_url: publicUrl,
        verification_category: null,
        is_supportive: false,
        supportive_doc_type: null,
        doc_code: doc.doc_code || null,
        is_active: true,
        uploaded_by: user?.id || null,
        uploaded_by_code: userCode || null,
      });
      if (insertErr) throw insertErr;

      // Audit log
      logAuditTrail({
        action: 'DOCUMENT_UPLOAD',
        entityType: 'meeting_uploaded_documents',
        entityId: meetingId,
        module: 'employer-applications',
        afterValue: { file_name: file.name, document_type: doc.document_type, application_reference: applicationReference },
        userCode: userCode || undefined,
        userId: user?.id,
      });

      toast.success(`"${file.name}" uploaded successfully`);
      await fetchAndMerge();
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleDocAction = async (doc: MergedDocument, action: 'view' | 'download') => {
    try {
      let url = doc.url;

      // For platform docs, get a signed URL from employer-documents bucket
      if (doc.source === 'platform' && doc.file_path) {
        const { data: signedData, error: signedErr } = await supabase.storage
          .from('employer-documents')
          .createSignedUrl(doc.file_path, 3600);
        if (signedErr) throw signedErr;
        url = signedData?.signedUrl || doc.url;
      }

      if (!url) {
        toast.error('Document URL is not available');
        return;
      }

      logAuditTrail({
        action: action === 'view' ? 'DOCUMENT_VIEW' : 'DOCUMENT_DOWNLOAD',
        entityType: 'employer-application-document',
        entityId: doc.id,
        module: 'employer-applications',
        metadata: { file_name: doc.file_name, meeting_id: meetingId },
        userCode: userCode || undefined,
        userId: user?.id,
      });

      if (action === 'view') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.file_name || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Document action failed:', err);
      toast.error('Failed to access document');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Documents
            </CardTitle>
            <CardDescription>
              {mergedDocs.length} document(s) — Upload or replace documents as needed
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAndMerge}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mergedDocs.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mergedDocs.map((doc, idx) => (
                <TableRow key={doc.id}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{doc.document_type || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[250px]">{doc.file_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {doc.source === 'platform' ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Uploaded
                      </Badge>
                    ) : (
                      <Badge variant="secondary">API</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'dd/MM/yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDocAction(doc, 'view')} title="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDocAction(doc, 'download')} title="Download">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUploadClick(idx)}
                        disabled={uploadingIdx !== null}
                        title={doc.source === 'platform' ? 'Re-upload' : 'Upload replacement'}
                      >
                        {uploadingIdx === idx ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-3.5 w-3.5 mr-1" />
                            {doc.source === 'platform' ? 'Replace' : 'Upload'}
                          </>
                        )}
                      </Button>
                      <input
                        type="file"
                        ref={(el) => { fileInputRefs.current[idx] = el; }}
                        className="hidden"
                        accept={ACCEPTED_TYPES.join(',')}
                        onChange={(e) => handleFileChange(idx, e.target.files?.[0])}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No documents available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
