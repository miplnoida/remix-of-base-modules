import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MockCase } from "@/data/mockLegalCases";
import { Plus, Shield, Eye, Download, Share2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddEvidenceDialog } from "@/components/legal/AddEvidenceDialog";
import { toast } from "sonner";

interface CaseEvidenceTabProps {
  caseData: MockCase;
}

const mockEvidence = [
  { id: 1, type: 'Document', description: 'Payment records 2024', source: 'Finance System', hash: 'a3f5b9c2...', sealed: false },
  { id: 2, type: 'Physical', description: 'Original signed agreement', source: 'Employer Office', hash: 'd8e1f4a7...', sealed: true },
];

export function CaseEvidenceTab({ caseData }: CaseEvidenceTabProps) {
  const [addOpen, setAddOpen] = useState(false);

  const handleView = (id: number) => {
    toast.info(`Opening evidence preview...`);
  };

  const handleDownload = (id: number, description: string) => {
    toast.success(`Downloading ${description}...`);
  };

  const handleShare = (id: number, description: string) => {
    toast.success(`Sharing ${description}...`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Evidence</h2>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Evidence
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Evidence Registry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Checksum</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockEvidence.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline">{item.type}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.source}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.hash}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleView(item.id)}
                        aria-label="View evidence"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(item.id, item.description)}
                        aria-label="Download evidence"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleShare(item.id, item.description)}
                        aria-label="Share evidence"
                        title="Share"
                      >
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

      <AddEvidenceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        caseId={caseData.id}
        onEvidenceAdded={() => {}}
      />
    </div>
  );
}
