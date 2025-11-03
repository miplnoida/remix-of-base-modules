import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MockCase } from "@/data/mockLegalCases";
import { Eye, Edit, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">Actions</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(party)}>
                          <Eye className="h-4 w-4 mr-2" />View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(party)}>
                          <Edit className="h-4 w-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(party)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
