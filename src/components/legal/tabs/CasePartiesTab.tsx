import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MockCase } from "@/data/mockLegalCases";
import { Eye, Edit, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { toast } from "sonner";

interface CasePartiesTabProps {
  caseData: MockCase;
}

export function CasePartiesTab({ caseData }: CasePartiesTabProps) {
  const handleView = (party: string) => {
    toast.info(`Viewing details for ${party}`);
  };

  const handleEdit = (party: string) => {
    toast.info(`Edit dialog for ${party} would open here`);
  };

  const handleDelete = (party: string) => {
    toast.error(`Delete confirmation for ${party} would appear here`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Parties & Representatives</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Party Listing</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SSN / Registration Number</TableHead>
                <TableHead>Representative</TableHead>
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
                  <TableCell className="font-mono text-sm">
                    {idx === 0 ? '123-45-6789' : `REG-${1000 + idx}`}
                  </TableCell>
                  <TableCell className="text-sm">
                    {idx > 0 ? 'Legal Counsel - John Smith' : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleView(party)}
                        aria-label={`View ${party}`}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEdit(party)}
                        aria-label={`Edit ${party}`}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(party)}
                        aria-label={`Delete ${party}`}
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
