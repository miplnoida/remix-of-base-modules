import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MockCase } from "@/data/mockLegalCases";
import { Plus, Mail, Send, Download, ArrowDown, ArrowUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewCorrespondenceDialog } from "@/components/legal/NewCorrespondenceDialog";
import { toast } from "sonner";

interface CaseCorrespondenceTabProps {
  caseData: MockCase;
}

const mockCorrespondence = [
  { id: 1, direction: 'Outbound', type: 'Notice', subject: 'Initial Summons Notification', sentOn: '2025-01-20', channel: 'Email, Print', status: 'Sent' },
  { id: 2, direction: 'Inbound', type: 'Response', subject: 'Request for Extension', sentOn: '2025-01-25', channel: 'Email', status: 'Received' },
];

export function CaseCorrespondenceTab({ caseData }: CaseCorrespondenceTabProps) {
  const [newCorrOpen, setNewCorrOpen] = useState(false);

  const handleDownload = (subject: string) => {
    toast.success(`Downloading ${subject}...`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Correspondence</h2>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setNewCorrOpen(true)}>
          <Plus className="h-4 w-4" />
          New Correspondence
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Communication History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Direction</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCorrespondence.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant={item.direction === 'Outbound' ? 'default' : 'outline'} className="gap-1">
                      {item.direction === 'Outbound' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      {item.direction}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell className="font-medium">{item.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(item.sentOn).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {item.channel.split(', ').map(ch => (
                        <Badge key={ch} variant="outline" className="text-xs">
                          {ch}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(item.subject)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewCorrespondenceDialog
        open={newCorrOpen}
        onOpenChange={setNewCorrOpen}
        caseId={caseData.id}
        caseNumber={caseData.number}
        onCorrespondenceSent={() => {}}
      />
    </div>
  );
}
