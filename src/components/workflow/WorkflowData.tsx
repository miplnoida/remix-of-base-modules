import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Download, FileJson } from "lucide-react";
import { mockFormSubmissions } from "@/services/mockData/workflowData";
import SubmissionDetailDialog from "./SubmissionDetailDialog";
import { useToast } from "@/hooks/use-toast";

export default function WorkflowData() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  const filteredSubmissions = mockFormSubmissions.filter(
    (sub) =>
      sub.stepName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.submittedByName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleView = (submission: any) => {
    setSelectedSubmission(submission);
  };

  const handleExport = () => {
    toast({ title: "Export Data", description: "Exporting form submissions to CSV..." });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{mockFormSubmissions.length}</div>
            <p className="text-sm text-muted-foreground">Total Submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {mockFormSubmissions.filter(s => s.stepName.includes("Intake")).length}
            </div>
            <p className="text-sm text-muted-foreground">Intake Forms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {mockFormSubmissions.filter(s => s.submittedBy).length}
            </div>
            <p className="text-sm text-muted-foreground">User Submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              <FileJson className="h-8 w-8" />
            </div>
            <p className="text-sm text-muted-foreground">Data Records</p>
          </CardContent>
        </Card>
      </div>

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
                      onClick={() => handleView(submission)}
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

      <SubmissionDetailDialog
        open={!!selectedSubmission}
        onOpenChange={(open) => !open && setSelectedSubmission(null)}
        submission={selectedSubmission}
      />
    </div>
  );
}
