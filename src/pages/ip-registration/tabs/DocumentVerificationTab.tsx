import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { IPFormData } from '../IPRegistrationForm';
import { Upload, File, Trash2, Download, FileText, Eye, Image as ImageIcon, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useVerifyTypes } from '@/hooks/useIPMasterLookups';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';

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
}

// --- Application Documents helpers (matching ApplicationDocumentsTab pattern) ---

interface AppDoc {
  id: string;
  document_name: string | null;
  document_type: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  url: string | null;
  signed_url: string | null;
  uploaded_at: string | null;
  transfer_status: string;
  dms_document_id: string | null;
}

function getAppDocUrl(doc: AppDoc): string | undefined {
  return doc.signed_url || doc.url || undefined;
}

function getAppDocName(doc: AppDoc, index: number): string {
  return doc.document_name || doc.file_name || `Document ${index + 1}`;
}

function getAppDocCategory(doc: AppDoc): 'pdf' | 'image' | 'other' {
  const name = (doc.file_name || doc.document_name || '').toLowerCase();
  const mime = (doc.mime_type || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mime.includes('image') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp')) return 'image';
  return 'other';
}

function getAppDocFileIcon(doc: AppDoc) {
  const cat = getAppDocCategory(doc);
  if (cat === 'pdf') return <FileText className="h-5 w-5 text-destructive" />;
  if (cat === 'image') return <ImageIcon className="h-5 w-5 text-primary" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatAppDocSize(size?: number | null): string {
  if (size === undefined || size === null) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAppDocDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM dd, yyyy');
  } catch {
    return dateStr;
  }
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
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Application documents state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; category: 'pdf' | 'image' | 'other' } | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  
  // Fetch verification types from tb_verify
  const { data: verifyTypes, isLoading: verifyLoading } = useVerifyTypes();

  // Fetch application documents from ip_application_documents by SSN
  const ssn = formData.ssn;
  const { data: appDocs = [], isLoading: appDocsLoading } = useQuery({
    queryKey: ['ip-application-documents', ssn],
    queryFn: async () => {
      if (!ssn) return [];
      const { data, error } = await supabase
        .from('ip_application_documents')
        .select('id, document_name, document_type, file_name, file_size, mime_type, url, signed_url, uploaded_at, transfer_status, dms_document_id')
        .eq('ssn', ssn)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AppDoc[];
    },
    enabled: !!ssn,
    staleTime: 60000,
  });

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ip_documents')
        .select('*')
        .eq('unique_uuid', formData.unique_uuid)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [formData.unique_uuid]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${formData.unique_uuid}/${documentType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('ip-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('ip_documents')
        .insert({
          unique_uuid: formData.unique_uuid,
          document_type: documentType,
          document_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
          is_temp: true,
        });

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: UploadedDocument) => {
    try {
      await supabase.storage.from('ip-documents').remove([doc.file_path]);

      const { error } = await supabase
        .from('ip_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleDownloadDocument = async (doc: UploadedDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('ip-documents')
        .download(doc.file_path);

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSelectChange = useCallback((field: string, value: string) => {
    onChange(field, value);
    clearError?.(field);
  }, [onChange, clearError]);

  // --- Application document view/download via document-proxy ---
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

    const contentType = proxyResponse.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await proxyResponse.arrayBuffer();
    return new Blob([arrayBuffer], { type: contentType });
  }, []);

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
    if (!docUrl) {
      toast.error('No document URL available');
      return;
    }

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
    if (!docUrl) {
      toast.error('No document URL available');
      return;
    }

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
    if (previewDoc?.url) {
      URL.revokeObjectURL(previewDoc.url);
    }
    setPreviewOpen(false);
    setPreviewDoc(null);
  }, [previewDoc]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Document Verification</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Marital Status Verification - from tb_verify */}
        <div className="space-y-2">
          <Label htmlFor="marital_doc_type">Marital Status Verification</Label>
          <Select 
            value={formData.marital_doc_type || ''} 
            onValueChange={(v) => handleSelectChange('marital_doc_type', v)}
            disabled={!isEditable || verifyLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={verifyLoading ? 'Loading...' : 'Select Document Type'} />
            </SelectTrigger>
            <SelectContent>
              {verifyTypes?.map(v => (
                <SelectItem key={v.code} value={v.code}>
                  {v.description || v.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Birth Status Verification - from tb_verify */}
        <div className="space-y-2">
          <Label htmlFor="birth_doc_type">
            Birth Status Verification <span className="text-destructive">*</span>
          </Label>
          <Select 
            value={formData.birth_doc_type || ''} 
            onValueChange={(v) => handleSelectChange('birth_doc_type', v)}
            disabled={!isEditable || verifyLoading}
          >
            <SelectTrigger className={errors.birth_doc_type ? 'border-destructive' : ''}>
              <SelectValue placeholder={verifyLoading ? 'Loading...' : 'Select Document Type'} />
            </SelectTrigger>
            <SelectContent>
              {verifyTypes?.map(v => (
                <SelectItem key={v.code} value={v.code}>
                  {v.description || v.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.birth_doc_type && <p className="text-xs text-destructive">{errors.birth_doc_type}</p>}
        </div>

        {/* Death Status Verification - from tb_verify */}
        <div className="space-y-2">
          <Label htmlFor="death_doc_type">Death Status Verification</Label>
          <Select 
            value={formData.death_doc_type || ''} 
            onValueChange={(v) => handleSelectChange('death_doc_type', v)}
            disabled={!isEditable || verifyLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={verifyLoading ? 'Loading...' : 'Select Document Type'} />
            </SelectTrigger>
            <SelectContent>
              {verifyTypes?.map(v => (
                <SelectItem key={v.code} value={v.code}>
                  {v.description || v.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Name Status Verification - from tb_verify */}
        <div className="space-y-2">
          <Label htmlFor="name_doc_type">
            Name Status Verification <span className="text-destructive">*</span>
          </Label>
          <Select 
            value={formData.name_doc_type || ''} 
            onValueChange={(v) => handleSelectChange('name_doc_type', v)}
            disabled={!isEditable || verifyLoading}
          >
            <SelectTrigger className={errors.name_doc_type ? 'border-destructive' : ''}>
              <SelectValue placeholder={verifyLoading ? 'Loading...' : 'Select Document Type'} />
            </SelectTrigger>
            <SelectContent>
              {verifyTypes?.map(v => (
                <SelectItem key={v.code} value={v.code}>
                  {v.description || v.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.name_doc_type && <p className="text-xs text-destructive">{errors.name_doc_type}</p>}
        </div>
      </div>

      {/* Application Documents from ip_application_documents */}
      {ssn && (
        <Card className="mt-8">
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
                          <Badge variant="outline" className="text-xs">
                            {doc.document_type || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatAppDocSize(doc.file_size)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatAppDocDate(doc.uploaded_at)}
                        </TableCell>
                        <TableCell>
                          {getTransferBadge(doc.transfer_status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {hasUrl ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewAppDoc(doc, index)}
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
                                  onClick={() => handleDownloadAppDoc(doc, index)}
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

      {/* Document Upload Section */}
      {isEditable && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Upload Supporting Documents</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Birth Certificate', 'ID Document', 'Marriage Certificate', 'Other'].map((docType) => (
              <Card key={docType}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{docType}</span>
                    <label className="cursor-pointer">
                      <Input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => handleFileUpload(e, docType)}
                        disabled={uploading}
                      />
                      <Button variant="outline" size="sm" asChild disabled={uploading}>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading ? 'Uploading...' : 'Upload'}
                        </span>
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Uploaded Documents</h3>
          
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <File className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.document_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.document_type} • {formatFileSize(doc.file_size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDownloadDocument(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {isEditable && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteDocument(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
}
