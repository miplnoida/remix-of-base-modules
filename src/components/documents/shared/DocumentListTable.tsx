import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Download, Eye, Image as ImageIcon, File, Loader2, Trash2, Info, Send } from 'lucide-react';
import { ExternalDocument } from '@/types/externalApplication';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDocumentTypeResolver } from '@/hooks/useDocumentTypeResolver';
import { useDocumentStatusDropdown } from '@/hooks/useDocumentStatusDropdown';
import { useVerifyTypes } from '@/hooks/useIPMasterLookups';
import { formatSize, formatDocDate, getFileCategory } from './types';

// --- Helpers for ExternalDocument ---

function getDocUrl(doc: ExternalDocument): string | undefined {
  return doc.signedUrl || doc.url;
}

function getDocName(doc: ExternalDocument, index: number): string {
  return doc.fileName || doc.name || `Document ${index + 1}`;
}

function getRawDocType(doc: ExternalDocument): string {
  return doc.verificationType || doc.documentType || doc.type || getFileCategory(doc.fileName || doc.name || '').toUpperCase();
}

function getDocumentTypeLabel(doc: ExternalDocument): string {
  return doc.documentType || '';
}

function getFileIcon(doc: ExternalDocument) {
  const cat = getFileCategory(doc.fileName || doc.name || '', doc.mimeType);
  if (cat === 'pdf') return <FileText className="h-5 w-5 text-destructive" />;
  if (cat === 'image') return <ImageIcon className="h-5 w-5 text-primary" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatFileSize(size?: string | number): string {
  if (size === undefined || size === null) return '—';
  const bytes = typeof size === 'string' ? parseInt(size, 10) : size;
  if (isNaN(bytes)) return String(size);
  return formatSize(bytes);
}

// --- Props ---

interface AppDocRow {
  id: string;
  document_name: string | null;
  document_type: string | null;
  file_name: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  verification_type: string | null;
  birth_status: string | null;
  name_status: string | null;
  marital_status: string | null;
  death_status: string | null;
}

interface DocumentListTableProps {
  documents?: ExternalDocument[];
  photoUrl?: string | null;
  onDelete?: (index: number) => void;
  showDelete?: boolean;
  ssn?: string | null;
  appDocs?: AppDocRow[];
  /** Fetch blob through secure proxy */
  fetchDocBlob: (docUrl: string, fileName: string, action: 'stream' | 'download') => Promise<Blob>;
  /** Additional columns/actions */
  title?: string;
  description?: string;
}

export function DocumentListTable({
  documents,
  photoUrl,
  onDelete,
  showDelete,
  ssn,
  appDocs = [],
  fetchDocBlob,
  title = 'Attached Documents',
  description = 'Documents submitted with this application',
}: DocumentListTableProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; category: 'pdf' | 'image' | 'other' } | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const { resolveDocType } = useDocumentTypeResolver();
  const { data: verifyTypes = [] } = useVerifyTypes();
  const { getStatusValue, hasStatusDropdown, handleStatusChange, getStatusLabel, isSaving } = useDocumentStatusDropdown(appDocs);

  const getMatchingAppDoc = useCallback((doc: ExternalDocument): AppDocRow | undefined => {
    if (!appDocs.length) return undefined;
    const fileName = doc.fileName || doc.name || '';
    return appDocs.find(ad =>
      (ad.file_name && ad.file_name === fileName) ||
      (ad.document_name && ad.document_name === fileName)
    );
  }, [appDocs]);

  const allDocs: ExternalDocument[] = [];
  if (photoUrl) {
    allDocs.push({
      id: '__photo__',
      fileName: 'Passport Photo',
      documentType: 'Photo',
      mimeType: 'image/png',
      signedUrl: photoUrl,
      uploadedAt: undefined,
    });
  }
  if (documents && documents.length > 0) {
    allDocs.push(...documents);
  }

  const totalCount = allDocs.length;

  const handleView = useCallback(async (doc: ExternalDocument, index: number) => {
    const docUrl = getDocUrl(doc);
    if (!docUrl) { toast.error('No document URL available'); return; }
    const category = getFileCategory(doc.fileName || doc.name || '', doc.mimeType);
    if (category !== 'image') return;
    const docId = doc.id || `doc-${index}`;
    const name = getDocName(doc, index);
    setLoadingDocId(docId);
    try {
      const blob = await fetchDocBlob(docUrl, name, 'stream');
      const blobUrl = URL.createObjectURL(blob);
      setPreviewDoc({ url: blobUrl, name, category });
      setPreviewOpen(true);
    } catch (err: any) {
      console.error('Document view error:', err);
      toast.error('Failed to load document', { description: err.message });
    } finally {
      setLoadingDocId(null);
    }
  }, [fetchDocBlob]);

  const handleDownload = useCallback(async (doc: ExternalDocument, index: number) => {
    const docUrl = getDocUrl(doc);
    if (!docUrl) { toast.error('No document URL available'); return; }
    const docId = doc.id || `doc-${index}`;
    const name = getDocName(doc, index);
    setLoadingDocId(docId);
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

  // Re-use the DocumentPreviewDialog inline for simplicity since this is already self-contained
  const { DocumentPreviewDialog } = require('./DocumentPreviewDialog');

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
            <Badge variant="secondary">{totalCount}</Badge>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {totalCount > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Type</TableHead>
                  {ssn && <TableHead>Verification Status</TableHead>}
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allDocs.map((doc, index) => {
                  const docId = doc.id || `doc-${index}`;
                  const isLoading = loadingDocId === docId;
                  const hasUrl = !!getDocUrl(doc);
                  const isImage = getFileCategory(doc.fileName || doc.name || '', doc.mimeType) === 'image';
                  const matchedAppDoc = ssn ? getMatchingAppDoc(doc) : undefined;
                  const showDropdown = matchedAppDoc ? hasStatusDropdown(matchedAppDoc) : false;
                  const statusVal = matchedAppDoc ? getStatusValue(matchedAppDoc.id) : undefined;
                  const statusLabel = matchedAppDoc ? getStatusLabel(matchedAppDoc.verification_type) : '';
                  const docTypeLabel = getDocumentTypeLabel(doc);

                  return (
                    <TableRow key={docId}>
                      <TableCell>{getFileIcon(doc)}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 flex-nowrap">
                          <span className="truncate">{getDocName(doc, index)}</span>
                          {docTypeLabel && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary cursor-help shrink-0">
                                  <Info className="h-3 w-3" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {docTypeLabel}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {resolveDocType(getRawDocType(doc))}
                        </Badge>
                      </TableCell>
                      {ssn && (
                        <TableCell>
                          {showDropdown && matchedAppDoc ? (
                            <Select
                              value={statusVal || undefined}
                              onValueChange={(v) => handleStatusChange(matchedAppDoc.id, matchedAppDoc.verification_type!, v)}
                              disabled={isSaving[matchedAppDoc.id]}
                            >
                              <SelectTrigger className="h-8 w-[180px] text-xs">
                                <SelectValue placeholder={`Select ${statusLabel}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {verifyTypes.map(v => (
                                  <SelectItem key={v.code} value={v.code}>
                                    {v.description || v.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-muted-foreground text-sm">
                        {formatFileSize(doc.fileSize)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDocDate(doc.uploadedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {hasUrl ? (
                            <>
                              {isImage && (
                                <Button variant="outline" size="sm" onClick={() => handleView(doc, index)} disabled={isLoading} className="gap-1.5">
                                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                                  View
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={() => handleDownload(doc, index)} disabled={isLoading} className="gap-1.5">
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No file available</span>
                          )}
                          {showDelete && onDelete && (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => {
                                const docOnlyIndex = photoUrl ? index - 1 : index;
                                if (docOnlyIndex >= 0) onDelete(docOnlyIndex);
                              }}
                              className="gap-1.5 text-destructive hover:text-destructive"
                              disabled={doc.id === '__photo__'}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
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
              <p className="font-medium">No documents attached</p>
              <p className="text-sm mt-1">Documents will appear here when uploaded by the applicant</p>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentPreviewDialog open={previewOpen} previewDoc={previewDoc} onClose={handleClosePreview} />
    </TooltipProvider>
  );
}
