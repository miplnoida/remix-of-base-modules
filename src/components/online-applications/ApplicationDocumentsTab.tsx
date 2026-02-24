import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Eye, Image as ImageIcon, File, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { ExternalDocument } from '@/types/externalApplication';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface ApplicationDocumentsTabProps {
  documents?: ExternalDocument[];
  photoUrl?: string | null;
  onDelete?: (index: number) => void;
  showDelete?: boolean;
}

/** Get the effective URL for a document (signedUrl takes priority) */
function getDocUrl(doc: ExternalDocument): string | undefined {
  return doc.signedUrl || doc.url;
}

/** Get display name for a document */
function getDocName(doc: ExternalDocument, index: number): string {
  return doc.fileName || doc.name || `Document ${index + 1}`;
}

/** Get display type for a document */
function getDocType(doc: ExternalDocument): string {
  return doc.documentType || doc.type || getFileCategory(doc).toUpperCase();
}

/** Determine file category from name, type, or mimeType */
function getFileCategory(doc: ExternalDocument): 'pdf' | 'image' | 'other' {
  const name = (doc.fileName || doc.name || '').toLowerCase();
  const type = (doc.documentType || doc.type || '').toLowerCase();
  const mime = (doc.mimeType || '').toLowerCase();

  if (mime.includes('pdf') || type.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (
    mime.includes('image') ||
    type.includes('image') ||
    name.endsWith('.jpg') || name.endsWith('.jpeg') ||
    name.endsWith('.png') || name.endsWith('.gif') ||
    name.endsWith('.webp') || name.endsWith('.svg')
  ) return 'image';
  return 'other';
}

function getFileIcon(doc: ExternalDocument) {
  const cat = getFileCategory(doc);
  if (cat === 'pdf') return <FileText className="h-5 w-5 text-destructive" />;
  if (cat === 'image') return <ImageIcon className="h-5 w-5 text-primary" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatFileSize(size?: string | number): string {
  if (size === undefined || size === null) return '—';
  const bytes = typeof size === 'string' ? parseInt(size, 10) : size;
  if (isNaN(bytes)) return String(size);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDocDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM dd, yyyy');
  } catch {
    return dateStr;
  }
}

export function ApplicationDocumentsTab({ documents, photoUrl, onDelete, showDelete }: ApplicationDocumentsTabProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; category: 'pdf' | 'image' | 'other' } | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  // Build a combined list: photo first, then documents
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

  /** Fetch document blob through the secure document-proxy edge function */
  const fetchDocBlob = useCallback(async (docUrl: string, fileName: string, action: 'stream' | 'download') => {
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

    // Get the content-type from the response to ensure blob has correct MIME type
    const contentType = proxyResponse.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await proxyResponse.arrayBuffer();
    return new Blob([arrayBuffer], { type: contentType });
  }, []);

  /** Convert blob to base64 data URL */
  const blobToDataUrl = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  /** Handle View click — open signedUrl directly in a new tab */
  const handleView = useCallback(async (doc: ExternalDocument, index: number) => {
    const docUrl = getDocUrl(doc);
    if (!docUrl) {
      toast.error('No document URL available');
      return;
    }

    const category = getFileCategory(doc);
    const name = getDocName(doc, index);

    if (category === 'image') {
      // For images, show in preview modal via proxy
      const docId = doc.id || `doc-${index}`;
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
    } else {
      // For PDFs and other files, open the signedUrl directly in a new tab
      window.open(docUrl, '_blank');
    }
  }, [fetchDocBlob]);

  /** Handle Download click */
  const handleDownload = useCallback(async (doc: ExternalDocument, index: number) => {
    const docUrl = getDocUrl(doc);
    if (!docUrl) {
      toast.error('No document URL available');
      return;
    }

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

  /** Cleanup blob URL on preview close */
  const handleClosePreview = useCallback(() => {
    if (previewDoc?.url) {
      URL.revokeObjectURL(previewDoc.url);
    }
    setPreviewOpen(false);
    setPreviewDoc(null);
  }, [previewDoc]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Attached Documents
            <Badge variant="secondary">{totalCount}</Badge>
          </CardTitle>
          <CardDescription>
            Documents submitted with this application
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalCount > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Type</TableHead>
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
                  return (
                    <TableRow key={docId}>
                      <TableCell>{getFileIcon(doc)}</TableCell>
                      <TableCell className="font-medium">{getDocName(doc, index)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getDocType(doc)}
                        </Badge>
                      </TableCell>
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleView(doc, index)}
                                disabled={isLoading}
                                className="gap-1.5"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(doc, index)}
                                disabled={isLoading}
                                className="gap-1.5"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No file available</span>
                          )}
                          {showDelete && onDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Calculate the document-only index (excluding photo)
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

      {/* Document Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) handleClosePreview(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDoc?.name || 'Document Preview'}
            </DialogTitle>
            <DialogDescription>
              Secure document preview
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto">
            {previewDoc?.category === 'pdf' && (
              <object
                data={previewDoc.url}
                type="application/pdf"
                className="w-full h-[70vh] border rounded-lg"
                title={previewDoc.name}
              >
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[70vh] border rounded-lg"
                  title={previewDoc.name}
                />
              </object>
            )}
            {previewDoc?.category === 'image' && (
              <div className="flex items-center justify-center p-4">
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
                />
              </div>
            )}
            {previewDoc?.category === 'other' && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mb-4 text-destructive" />
                <p className="font-medium text-lg">Preview not available</p>
                <p className="text-sm mt-1 mb-4">This file format cannot be previewed in the browser.</p>
                <Button
                  variant="default"
                  onClick={() => {
                    if (previewDoc.url) {
                      const link = document.createElement('a');
                      link.href = previewDoc.url;
                      link.download = previewDoc.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Instead
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
