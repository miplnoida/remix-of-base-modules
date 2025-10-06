import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MockCase } from "@/data/mockLegalCases";
import { Plus, UserPlus, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddPartyDialog } from "@/components/legal/AddPartyDialog";
import { RecordServiceDialog } from "@/components/legal/RecordServiceDialog";

interface CasePartiesTabProps {
  caseData: MockCase;
}

const getServiceStatusBadge = (status: string) => {
  switch (status) {
    case 'Served':
      return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Served</Badge>;
    case 'Attempted':
      return <Badge variant="warning"><AlertCircle className="h-3 w-3 mr-1" />Attempted</Badge>;
    case 'Failed':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    default:
      return <Badge variant="outline">Not Served</Badge>;
  }
};

export function CasePartiesTab({ caseData }: CasePartiesTabProps) {
  const [addPartyOpen, setAddPartyOpen] = useState(false);
  const [addRepOpen, setAddRepOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);

  const handleRecordService = (partyName: string) => {
    setSelectedParty(partyName);
    setServiceOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Parties & Representatives</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setAddPartyOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Party
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setAddRepOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add Representative
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parties</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Registry Ref</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Representative</TableHead>
                <TableHead>Service Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {caseData.parties.map((party, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Badge variant="outline">
                      {idx === 0 ? 'Applicant' : 'Respondent'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{party}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {idx === 0 ? 'SSB-001' : `REG-${1000 + idx}`}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    contact@example.com
                  </TableCell>
                  <TableCell className="text-sm">
                    {idx > 0 ? 'Legal Counsel' : '—'}
                  </TableCell>
                  <TableCell>
                    {getServiceStatusBadge(idx === 0 ? 'N/A' : idx % 2 === 0 ? 'Served' : 'Attempted')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">Link to Registry</Button>
                      {idx > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRecordService(party)}
                        >
                          Record Service
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Service of Process */}
      <Card>
        <CardHeader>
          <CardTitle>Service of Process</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Record service attempts and confirmations for all parties.
            </p>
            <Button variant="outline" className="gap-2" onClick={() => setServiceOpen(true)}>
              <Plus className="h-4 w-4" />
              Record Service Attempt
            </Button>
          </div>
        </CardContent>
      </Card>

      <AddPartyDialog
        open={addPartyOpen}
        onOpenChange={setAddPartyOpen}
        caseId={caseData.id}
        onPartyAdded={() => {}}
      />

      <AddPartyDialog
        open={addRepOpen}
        onOpenChange={setAddRepOpen}
        caseId={caseData.id}
        onPartyAdded={() => {}}
      />

      <RecordServiceDialog
        open={serviceOpen}
        onOpenChange={setServiceOpen}
        caseId={caseData.id}
        partyName={selectedParty || undefined}
        onServiceRecorded={() => {}}
      />
    </div>
  );
}
