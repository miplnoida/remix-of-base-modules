import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { runTemplateValidation, type ValidationFinding } from "@/lib/enterprise/runtimeValidation";

export default function RuntimeValidationPanel() {
  const [findings, setFindings] = useState<ValidationFinding[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    const r = await runTemplateValidation();
    setFindings(r);
    setLastRun(new Date().toLocaleString());
    setRunning(false);
  };

  useEffect(() => { run(); }, []);

  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Runtime Validation</CardTitle>
          <CardDescription>
            Scans active business templates for missing layouts, missing branding tokens, and inline branding/footer/signature/disclaimer that should be resolved centrally.
          </CardDescription>
        </div>
        <Button onClick={run} disabled={running}>{running ? "Scanning…" : "Re-scan"}</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="destructive">Errors: {errors}</Badge>
          <Badge className="bg-amber-500">Warnings: {warnings}</Badge>
          {lastRun && <span className="text-muted-foreground">Last run: {lastRun}</span>}
        </div>
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No findings. All business templates pass the enterprise contract.</p>
        ) : (
          <Table sticky>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Finding</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {findings.map((f, i) => (
                <TableRow key={`${f.templateId}-${f.code}-${i}`}>
                  <TableCell>
                    <Badge variant={f.severity === "error" ? "destructive" : "outline"}>{f.severity}</Badge>
                  </TableCell>
                  <TableCell>{f.templateName}</TableCell>
                  <TableCell className="font-mono text-xs">{f.templateCode}</TableCell>
                  <TableCell className="font-mono text-xs">{f.code}</TableCell>
                  <TableCell>{f.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
