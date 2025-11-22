import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Download } from "lucide-react";
import { mockFormSubmissions } from "@/services/mockData/workflowData";
import { useToast } from "@/hooks/use-toast";

export default function WorkflowData() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSubmissions = mockFormSubmissions.filter(
    (sub) =>
      sub.stepName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.submittedByName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleView = (submissionId: string) => {
    toast({ title: "View Submission", description: `Opening submission ${submissionId}` });
  };

  const handleExport = () => {
    toast({ title: "Export Data", description: "Exporting form submissions to CSV..." });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search submissions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export All
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submission ID</TableHead>
              <TableHead>Run ID</TableHead>
              <TableHead>Step Name</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Submitted At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubmissions.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell className="font-mono text-xs">{submission.id}</TableCell>
                <TableCell className="font-mono text-xs">{submission.runId}</TableCell>
                <TableCell className="font-medium">{submission.stepName}</TableCell>
                <TableCell>{submission.submittedByName || "System"}</TableCell>
                <TableCell className="text-sm">
                  {new Date(submission.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(submission.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
