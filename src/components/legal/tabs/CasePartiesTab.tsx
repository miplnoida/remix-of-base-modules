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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>SSN</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>TIN</TableHead>
                  <TableHead>Representative</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                      {idx === 0 ? '556655' : '789123'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {idx === 0 ? 'applicant@email.com' : 'respondent@company.com'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {idx === 0 ? '+1-869-555-0123' : '+1-869-555-0456'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {idx === 0 ? 'Male' : 'Female'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {idx === 0 ? '15-03-1985' : '22-07-1978'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {idx === 0 ? 'TIN-001234' : 'TIN-005678'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {idx > 0 ? 'Legal Counsel - John Smith' : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleView(party)}
                          aria-label={`View ${party}`}
                          title="View"
                          className="h-9 w-9 border-[#06B6D4] text-[#06B6D4] hover:bg-[#06B6D4] hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleEdit(party)}
                          aria-label={`Edit ${party}`}
                          title="Edit"
                          className="h-9 w-9 border-[#06B6D4] text-[#06B6D4] hover:bg-[#06B6D4] hover:text-white"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          onClick={() => handleDelete(party)}
                          aria-label={`Delete ${party}`}
                          title="Delete"
                          className="h-9 w-9"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
