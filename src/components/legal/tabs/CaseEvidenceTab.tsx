import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MockCase } from "@/data/mockLegalCases";
import { Plus, Shield, Lock, Unlock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CaseEvidenceTabProps {
  caseData: MockCase;
}

const mockEvidence = [
  { id: 1, type: 'Document', description: 'Payment records 2024', source: 'Finance System', hash: 'a3f5b9c2...', sealed: false },
  { id: 2, type: 'Physical', description: 'Original signed agreement', source: 'Employer Office', hash: 'd8e1f4a7...', sealed: true },
];

export function CaseEvidenceTab({ caseData }: CaseEvidenceTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Evidence</h2>
        <Button variant="outline" size="sm" className="gap-2">
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
                <TableHead>Status</TableHead>
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
                    {item.sealed ? (
                      <Badge className="bg-amber-600 text-white gap-1">
                        <Lock className="h-3 w-3" />
                        Sealed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Unlock className="h-3 w-3" />
                        Unsealed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      {item.sealed ? 'Unseal' : 'Seal'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
