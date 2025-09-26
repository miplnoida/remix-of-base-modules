import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, FileText, Download, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LegalFinalService } from '@/services/legalFinalService';
import { CourtCase, CaseDocument } from '@/types/legalFinal';

const documentUploadSchema = z.object({
  documentType: z.enum(['Summons', 'Affidavit', 'Payroll Evidence', 'Judgment', 'Order', 'Appeal Filing']),
  file: z.any().optional(),
  fileName: z.string().min(1, 'File name is required'),
});

type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;

export const DocumentUploadForm = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [courtCase, setCourtCase] = useState<CourtCase | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<DocumentUploadFormData>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      fileName: '',
    }
  });

  useEffect(() => {
    const loadCaseAndDocuments = async () => {
      if (!caseId) return;
      
      try {
        const [caseData, documentsData] = await Promise.all([
          LegalFinalService.getCourtCaseById(caseId),
          LegalFinalService.getCaseDocuments(caseId)
        ]);
        
        if (caseData) {
          setCourtCase(caseData);
          setDocuments(documentsData);
        } else {
          toast({
            title: "Error",
            description: "Case not found",
            variant: "destructive",
          });
          navigate('/legal-final/cases');
        }
      } catch (error) {
        console.error('Failed to load case and documents:', error);
        toast({
          title: "Error",
          description: "Failed to load case details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadCaseAndDocuments();
  }, [caseId, toast, navigate]);

  const onSubmit = async (data: DocumentUploadFormData) => {
    if (!caseId) return;

    setUploading(true);
    try {
      const newDocument = await LegalFinalService.uploadDocument({
        caseID: caseId,
        documentType: data.documentType,
        fileName: data.fileName,
        uploadedBy: 'Current User', // In real app, get from auth context
        uploadDate: new Date().toISOString().split('T')[0],
        fileSize: '2.1 MB' // Mock file size
      });

      setDocuments([...documents, newDocument]);
      form.reset();
      
      toast({
        title: "Document Uploaded",
        description: `${data.documentType} uploaded successfully`,
      });
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'Summons': return 'destructive';
      case 'Affidavit': return 'warning';
      case 'Payroll Evidence': return 'info';
      case 'Judgment': return 'success';
      case 'Order': return 'default';
      case 'Appeal Filing': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading case documents...</p>
        </div>
      </div>
    );
  }

  if (!courtCase) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Case not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/legal-final/cases')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cases
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Document Management</h1>
          <p className="text-muted-foreground">Case {courtCase.caseID} - {courtCase.employerName || courtCase.contributorName}</p>
        </div>
      </div>

      {/* Case Info */}
      <Card>
        <CardHeader>
          <CardTitle>Case Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Case Type</p>
              <p className="font-medium">{courtCase.caseType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{courtCase.caseStatus}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Officer</p>
              <p className="font-medium">{courtCase.officerAssigned}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Documents</p>
              <p className="font-medium">{documents.length} uploaded</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload New Document
            </CardTitle>
            <CardDescription>
              Upload legal documents related to this case
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Summons">Summons</SelectItem>
                          <SelectItem value="Affidavit">Affidavit</SelectItem>
                          <SelectItem value="Payroll Evidence">Payroll Evidence</SelectItem>
                          <SelectItem value="Judgment">Judgment</SelectItem>
                          <SelectItem value="Order">Order</SelectItem>
                          <SelectItem value="Appeal Filing">Appeal Filing</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fileName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter file name (e.g., summons_2024.pdf)" {...field} />
                      </FormControl>
                      <FormDescription>
                        Include file extension for proper identification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="file"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File Upload</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          accept=".pdf,.doc,.docx,.jpg,.png"
                          onChange={(e) => field.onChange(e.target.files?.[0])}
                        />
                      </FormControl>
                      <FormDescription>
                        Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={uploading} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Document Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Document Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Summons', 'Affidavit', 'Payroll Evidence', 'Judgment', 'Order', 'Appeal Filing'].map((type) => {
                const count = documents.filter(d => d.documentType === type).length;
                return (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm">{type}</span>
                    <Badge variant={getDocumentTypeColor(type) as any}>
                      {count}
                    </Badge>
                  </div>
                );
              })}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between font-medium">
                  <span>Total Documents</span>
                  <span>{documents.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uploaded Documents
          </CardTitle>
          <CardDescription>
            All documents associated with this case
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.documentID}>
                      <TableCell className="font-medium">{doc.fileName}</TableCell>
                      <TableCell>
                        <Badge variant={getDocumentTypeColor(doc.documentType) as any}>
                          {doc.documentType}
                        </Badge>
                      </TableCell>
                      <TableCell>{doc.uploadedBy}</TableCell>
                      <TableCell>{doc.uploadDate}</TableCell>
                      <TableCell>{doc.fileSize}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No documents uploaded yet</p>
              <p className="text-sm text-muted-foreground">Upload your first document using the form above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};