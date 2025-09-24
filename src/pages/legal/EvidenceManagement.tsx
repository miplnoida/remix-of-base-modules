import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Download, Eye, Trash2, Search, Filter, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EvidenceManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [caseFilter, setCaseFilter] = useState('');

  const documentTypes = [
    'Notice',
    'Court Order',
    'Testimony',
    'Wage Record',
    'Financial Statement',
    'Medical Report',
    'Photo Evidence',
    'Audio Recording',
    'Video Recording',
    'Email Correspondence',
    'Contract',
    'Other'
  ];

  const mockDocuments = [
    {
      id: 'DOC-2024-001',
      caseId: 'LC-2024-089',
      fileName: 'penalty_notice_signed.pdf',
      documentType: 'Notice',
      uploadedBy: 'Sarah Johnson',
      dateUploaded: '2024-01-20',
      fileSize: '2.4 MB',
      accessLevel: 'Restricted',
      version: 1,
      description: 'Signed penalty notice delivered to ABC Manufacturing',
      isEncrypted: true
    },
    {
      id: 'DOC-2024-002',
      caseId: 'LC-2024-089',
      fileName: 'wage_records_q4_2023.xlsx',
      documentType: 'Wage Record',
      uploadedBy: 'Michael Chen',
      dateUploaded: '2024-01-18',
      fileSize: '1.2 MB',
      accessLevel: 'Internal',
      version: 2,
      description: 'Employee wage records for Q4 2023 - ABC Manufacturing',
      isEncrypted: true
    },
    {
      id: 'DOC-2024-003',
      caseId: 'LC-2024-088',
      fileName: 'medical_report_john_smith.pdf',
      documentType: 'Medical Report',
      uploadedBy: 'Lisa Wang',
      dateUploaded: '2024-01-15',
      fileSize: '856 KB',
      accessLevel: 'Confidential',
      version: 1,
      description: 'Medical assessment report for disability claim review',
      isEncrypted: true
    },
    {
      id: 'DOC-2024-004',
      caseId: 'LC-2024-087',
      fileName: 'court_summons_xyz_corp.pdf',
      documentType: 'Court Order',
      uploadedBy: 'David Rodriguez',
      dateUploaded: '2024-01-12',
      fileSize: '724 KB',
      accessLevel: 'Public',
      version: 1,
      description: 'Court summons issued to XYZ Services Corp',
      isEncrypted: false
    },
    {
      id: 'DOC-2024-005',
      caseId: 'LC-2024-089',
      fileName: 'bank_statements_abc_manufacturing.pdf',
      documentType: 'Financial Statement',
      uploadedBy: 'Emma Thompson',
      dateUploaded: '2024-01-10',
      fileSize: '3.1 MB',
      accessLevel: 'Confidential',
      version: 1,
      description: 'Bank statements showing payment history',
      isEncrypted: true
    }
  ];

  const mockCases = [
    { id: 'LC-2024-089', party: 'ABC Manufacturing Ltd', type: 'Non-Compliance' },
    { id: 'LC-2024-088', party: 'John Smith', type: 'Benefit Dispute' },
    { id: 'LC-2024-087', party: 'XYZ Services Corp', type: 'Appeal' }
  ];

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = searchTerm === '' || 
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === '' || doc.documentType === typeFilter;
    const matchesCase = caseFilter === '' || doc.caseId === caseFilter;
    
    return matchesSearch && matchesType && matchesCase;
  });

  const handleFileUpload = () => {
    // Mock file upload
    toast({
      title: "Document Uploaded",
      description: "Evidence document has been uploaded and encrypted successfully.",
    });
  };

  const handleDownload = (document: any) => {
    toast({
      title: "Download Started",
      description: `Downloading ${document.fileName}...`,
    });
  };

  const handleDelete = (document: any) => {
    toast({
      title: "Document Deleted",
      description: `${document.fileName} has been permanently deleted.`,
      variant: "destructive"
    });
  };

  const getAccessLevelBadge = (accessLevel: string) => {
    switch (accessLevel) {
      case 'Public': return <Badge variant="secondary">{accessLevel}</Badge>;
      case 'Internal': return <Badge variant="default">{accessLevel}</Badge>;
      case 'Restricted': return <Badge variant="secondary">{accessLevel}</Badge>;
      case 'Confidential': return <Badge variant="destructive">{accessLevel}</Badge>;
      default: return <Badge variant="secondary">{accessLevel}</Badge>;
    }
  };

  const getDocumentIcon = (documentType: string) => {
    switch (documentType) {
      case 'Notice':
      case 'Court Order':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'Financial Statement':
      case 'Wage Record':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'Medical Report':
        return <FileText className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/legal')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Legal Module
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Legal Module</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Evidence & Document Management</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Bulk Download
              </Button>
              <Button size="sm" onClick={handleFileUpload}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Evidence
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Evidence & Document Management</h1>
          <p className="text-gray-600">Securely manage legal documents and evidence with version control</p>
        </div>

        {/* Upload Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload New Evidence</CardTitle>
            <CardDescription>Add documents and evidence to legal cases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Linked Case ID</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select case" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCases.map((case_) => (
                      <SelectItem key={case_.id} value={case_.id}>
                        {case_.id} - {case_.party}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Public">Public</SelectItem>
                    <SelectItem value="Internal">Internal</SelectItem>
                    <SelectItem value="Restricted">Restricted</SelectItem>
                    <SelectItem value="Confidential">Confidential</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, MP3, MP4 (Max 10MB)
                </p>
                <Button variant="outline" size="sm" onClick={handleFileUpload}>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Evidence Documents</CardTitle>
                <CardDescription>All uploaded documents with secure access control</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    className="pl-8 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={caseFilter} onValueChange={setCaseFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Cases" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Cases</SelectItem>
                    {mockCases.map((case_) => (
                      <SelectItem key={case_.id} value={case_.id}>{case_.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Case ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {getDocumentIcon(document.documentType)}
                        <div>
                          <div className="font-medium flex items-center space-x-2">
                            <span>{document.fileName}</span>
                            {document.isEncrypted && <Lock className="h-3 w-3 text-green-500" />}
                          </div>
                          <div className="text-sm text-gray-500">{document.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{document.caseId}</TableCell>
                    <TableCell>{document.documentType}</TableCell>
                    <TableCell>{document.uploadedBy}</TableCell>
                    <TableCell>{document.dateUploaded}</TableCell>
                    <TableCell>{document.fileSize}</TableCell>
                    <TableCell>{getAccessLevelBadge(document.accessLevel)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">v{document.version}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDownload(document)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(document)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredDocuments.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No documents found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Lock className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Security & Compliance</h4>
                <p className="text-sm text-blue-700 mt-1">
                  All uploaded documents are automatically encrypted and access is logged for audit purposes. 
                  Only authorized personnel can view confidential and restricted documents. 
                  Documents are stored with version control and cannot be modified once uploaded.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EvidenceManagement;