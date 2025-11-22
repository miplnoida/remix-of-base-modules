import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubmissionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: any;
}

export default function SubmissionDetailDialog({ open, onOpenChange, submission }: SubmissionDetailDialogProps) {
  const { toast } = useToast();

  if (!submission) return null;

  const handleExport = () => {
    toast({ title: "Export Submission", description: "Downloading submission data as JSON" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Form Submission Details</DialogTitle>
          <DialogDescription>
            Submission ID: {submission.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Run ID</CardTitle>
              </CardHeader>
              <CardContent className="font-mono text-sm">
                {submission.runId}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Step Name</CardTitle>
              </CardHeader>
              <CardContent className="font-medium">
                {submission.stepName}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Submitted By</CardTitle>
              </CardHeader>
              <CardContent className="font-medium">
                {submission.submittedByName || "System"}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Submitted At</CardTitle>
              </CardHeader>
              <CardContent>
                {new Date(submission.createdAt).toLocaleString()}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Form Data</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(submission.formData).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b last:border-0">
                    <span className="font-medium text-muted-foreground">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className="font-medium">
                      {typeof value === 'boolean' ? (
                        <Badge variant={value ? "default" : "secondary"}>
                          {value ? "Yes" : "No"}
                        </Badge>
                      ) : typeof value === 'object' ? (
                        JSON.stringify(value)
                      ) : (
                        String(value)
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Raw JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(submission.formData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
