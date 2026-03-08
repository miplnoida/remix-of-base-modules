import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Upload, File, Trash2, Download, AlertTriangle, Loader2, ShieldCheck, ShieldAlert, ScanSearch } from 'lucide-react';
import { IPMasterFormData } from '@/types/ipRegistration';
import { useVerifyTypes } from '@/hooks/useIPMasterLookups';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDocumentPurposeValidation, type DocumentValidationResult } from '@/hooks/useDocumentPurposeValidation';
import { useAuth } from '@/contexts/AuthContext';
import { EXTERNAL_DOC_TYPE_TO_VERIFY_CODE } from '@/components/documents/shared/types';

interface VerificationTabProps {
  formData: IPMasterFormData;
  updateField: (field: keyof IPMasterFormData, value: any) => void;
  isEditable: boolean;
}

interface UploadedDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}

export const VerificationTab: React.FC<VerificationTabProps> = ({
  formData,
  updateField,
  isEditable,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: verifyTypes = [], isLoading: loadingVerifyTypes } = useVerifyTypes();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [validatingDocType, setValidatingDocType] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, DocumentValidationResult>>({});
  const purposeValidation = useDocumentPurposeValidation();

  const isMarried = formData.marital_status === 'M';
  const hasMarriageCert = documents.some(d => d.document_type === 'Marriage Certificate');

  const fetchDocuments = useCallback(async () => {
    if (!formData.ssn) return;
    try {
      const { data, error } = await supabase
        .from('ip_application_documents')
        .select('id, document_name, document_type, file_name, file_path, file_size, uploaded_at')
        .eq('ssn', formData.ssn)
        .order('uploaded_at', { ascending: false });
      if (!error) {
        const mapped = (data || []).map((d: any) => ({
          id: d.id,
          document_type: d.document_name || d.document_type || '',
          document_name: d.file_name || d.document_name || '',
          file_path: d.file_path || '',
          file_size: d.file_size || 0,
          uploaded_at: d.uploaded_at || '',
        }));
        setDocuments(mapped);
      }
    } catch (e) { /* ignore */ }
  }, [formData.ssn]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = e.target.files?.[0];
    if (!file || !formData.ssn) return;
    setUploading(true);
    setValidatingDocType(documentType);
    
    try {
      // Resolve doc_code from documentType name
      const docCode = EXTERNAL_DOC_TYPE_TO_VERIFY_CODE[documentType] || '';
      
      // Step 1: Server-side document purpose validation
      if (docCode) {
        const validationResult = await purposeValidation.validateDocument(
          file, docCode, documentType, undefined, user?.id
        );
        
        setValidationResults(prev => ({ ...prev, [documentType]: validationResult }));

        if (!validationResult.is_valid) {
          toast({
            title: 'Document verification failed',
            description: validationResult.user_message || `The uploaded file does not appear to be a valid ${documentType}. Please check the file and try again.`,
            variant: 'destructive',
          });
          setUploading(false);
          setValidatingDocType(null);
          return;
        }
      }
      
      setValidatingDocType(null);
      
      // Step 2: Upload file
      const fileExt = file.name.split('.').pop();
      const fileName = `${formData.ssn}/${documentType}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('ip-documents').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from('ip_application_documents').insert({
        ssn: formData.ssn,
        document_name: documentType,
        document_type: docCode || 'mandatory',
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        transfer_status: 'Pending',
      });
      if (dbError) throw dbError;
      toast({ title: 'Document verified & uploaded successfully' });
      fetchDocuments();
    } catch (error: any) {
      toast({ title: 'Failed to upload document', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      setValidatingDocType(null);
    }
  };

  const handleDeleteDocument = async (doc: UploadedDocument) => {
    try {
      if (doc.file_path) {
        await supabase.storage.from('ip-documents').remove([doc.file_path]);
      }
      await supabase.from('ip_application_documents').delete().eq('id', doc.id);
      toast({ title: 'Document deleted' });
      fetchDocuments();
    } catch (error: any) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
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
    } catch (error: any) {
      toast({ title: 'Failed to download', description: error.message, variant: 'destructive' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const docTypes = isMarried
    ? ['Birth Certificate', 'ID Document', 'Marriage Certificate', 'Other']
    : ['Birth Certificate', 'ID Document', 'Other'];

  return (
    <div className="space-y-6">
      {/* Marriage Certificate Warning */}
      {isMarried && !hasMarriageCert && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            Marital status is set to <strong>Married</strong>. A Marriage Certificate must be uploaded before submission or approval.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Document Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="verify_birth_code">Birth Status Verification</Label>
              <Select
                value={formData.verify_birth_code}
                onValueChange={(value) => updateField('verify_birth_code', value)}
                disabled={!isEditable || loadingVerifyTypes}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {verifyTypes.map((doc) => (
                    <SelectItem key={doc.code} value={doc.code}>{doc.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="verify_name_code">Name Status Verification</Label>
              <Select
                value={formData.verify_name_code}
                onValueChange={(value) => updateField('verify_name_code', value)}
                disabled={!isEditable || loadingVerifyTypes}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {verifyTypes.map((doc) => (
                    <SelectItem key={doc.code} value={doc.code}>{doc.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="verify_marital_code">Marital Status Verification</Label>
              <Select
                value={formData.verify_marital_code}
                onValueChange={(value) => updateField('verify_marital_code', value)}
                disabled={!isEditable || loadingVerifyTypes}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {verifyTypes.map((doc) => (
                    <SelectItem key={doc.code} value={doc.code}>{doc.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="verify_death_code">Death Status Verification</Label>
              <Select
                value={formData.verify_death_code}
                onValueChange={(value) => updateField('verify_death_code', value)}
                disabled={!isEditable || loadingVerifyTypes}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {verifyTypes.map((doc) => (
                    <SelectItem key={doc.code} value={doc.code}>{doc.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date_verified">Date of Verification</Label>
              <Input
                id="date_verified"
                type="date"
                value={formData.date_verified}
                onChange={(e) => updateField('date_verified', e.target.value)}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label htmlFor="verified_by">Verified By</Label>
              <Input
                id="verified_by"
                value={formData.verified_by}
                onChange={(e) => updateField('verified_by', e.target.value)}
                disabled={!isEditable}
                maxLength={5}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Supporting Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditable && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {docTypes.map((docType) => {
                const vResult = validationResults[docType];
                const isCurrentlyValidating = validatingDocType === docType;
                return (
                  <div key={docType} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {docType}
                        {docType === 'Marriage Certificate' && isMarried && ' *'}
                      </span>
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
                            {isCurrentlyValidating ? (
                              <><ScanSearch className="h-4 w-4 mr-2 animate-pulse" /> Verifying...</>
                            ) : uploading && validatingDocType !== docType ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                            ) : (
                              <><Upload className="h-4 w-4 mr-2" /> Upload</>
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                    {/* Validation result inline */}
                    {vResult && !isCurrentlyValidating && (
                      vResult.is_valid ? (
                        vResult._fallback ? (
                          <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>{vResult.user_message || 'Document accepted pending manual review.'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>{vResult.user_message || 'Document verified'} ({Math.round(vResult.confidence * 100)}% match)</span>
                          </div>
                        )
                      ) : (
                        <div className="flex items-start gap-1.5 text-xs text-destructive">
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{vResult.user_message || vResult.reason}</span>
                        </div>
                      )
                    )}
                    {isCurrentlyValidating && (
                      <div className="flex items-center gap-1.5 text-xs text-primary">
                        <ScanSearch className="h-3.5 w-3.5 animate-pulse" />
                        <span>Analyzing document content...</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Uploaded Documents List */}
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{doc.document_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.document_type} • {formatFileSize(doc.file_size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleDownloadDocument(doc)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    {isEditable && (
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteDocument(doc)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No documents uploaded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
