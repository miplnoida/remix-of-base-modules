import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MockCase } from "@/data/mockLegalCases";
import { Plus, Upload, FileText, Download, Share2, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadDocumentDialog } from "@/components/legal/UploadDocumentDialog";
import { GenerateTemplateDialog } from "@/components/legal/GenerateTemplateDialog";
import { toast } from "sonner";

interface CaseDocumentsTabProps {
  caseData: MockCase;
}

const DOCUMENT_FOLDERS = [
  'All', 'Filings', 'Notices', 'Internal', 'Other'
];

const mockDocuments = [
  { id: 1, name: 'Initial Complaint.pdf', type: 'Filing', version: '1.0', uploadedBy: 'Legal Officer', uploadedOn: '2025-01-15', confidential: false, folder: 'Filings' },
  { id: 2, name: 'Summons Form 37.pdf', type: 'Notice', version: '1.0', uploadedBy: 'System', uploadedOn: '2025-01-20', confidential: false, folder: 'Notices' },
  { id: 3, name: 'Payment Records.xlsx', type: 'Evidence', version: '1.0', uploadedBy: 'Finance Officer', uploadedOn: '2025-01-18', confidential: true, folder: 'Evidence' },
];

export function CaseDocumentsTab({ caseData }: CaseDocumentsTabProps) {
  const [activeFolder, setActiveFolder] = useState('All');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  const filteredDocuments = activeFolder === 'All'
    ? mockDocuments
    : mockDocuments.filter(doc => doc.folder === activeFolder);

  const handleView = (docName: string) => {
    toast.info(`Opening ${docName}...`);
  };

  const handleDownload = (docName: string) => {
    toast.success(`Downloading ${docName}...`);
  };

  const handleShare = (docName: string) => {
    toast.info(`Share dialog for ${docName} would open here`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Other Documents</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            Upload
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setGenerateOpen(true)}>
            <FileText className="h-4 w-4" />
            Generate from Template
          </Button>
        </div>
      </div>

      {/* Folder Filters */}
      <div className="flex gap-2 flex-wrap">
        {DOCUMENT_FOLDERS.map(folder => (
          <Badge
            key={folder}
            variant={activeFolder === folder ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setActiveFolder(folder)}
          >
            {folder}
          </Badge>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Uploaded On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {doc.name}
                  </TableCell>
                  <TableCell>{doc.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      v{doc.version}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{doc.uploadedBy}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(doc.uploadedOn).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {doc.confidential && (
                      <Badge variant="warning" className="text-xs">Confidential</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleView(doc.name)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(doc.name)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleShare(doc.name)}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        caseId={caseData.id}
        onDocumentUploaded={() => {}}
      />

      <GenerateTemplateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        caseId={caseData.id}
        caseNumber={caseData.number}
        onDocumentGenerated={() => {}}
      />
    </div>
  );
}
