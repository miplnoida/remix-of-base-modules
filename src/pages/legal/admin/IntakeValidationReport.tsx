import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildValidationReport, type IntakeValidationRow } from "@/services/legal/lgIntakeService";
import { toast } from "sonner";

export default function IntakeValidationReport() {
  const [rows, setRows] = useState<IntakeValidationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setRows(await buildValidationReport());
      } catch (e: any) {
        toast.error("Failed to build report", { description: e?.message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const issuesCount = rows.reduce((n, r) => n + (r.issues.length > 0 ? 1 : 0), 0);

  return (
    <div className="flex-1 p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Intake Validation Report</h1>
        <p className="text-muted-foreground">
          Confirms every intake has linked entity, parties, documents, routing, and assignment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Loading…" : `${rows.length} intakes · ${issuesCount} with issues`}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intake No</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Matter Type</TableHead>
                <TableHead>Primary Entity</TableHead>
                <TableHead>Legal Case</TableHead>
                <TableHead className="text-right">Parties</TableHead>
                <TableHead className="text-right">Docs</TableHead>
                <TableHead>Routing</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.intake_no}>
                  <TableCell className="font-medium">{r.intake_no}</TableCell>
                  <TableCell>{r.source_module}</TableCell>
                  <TableCell>{r.matter_type_code}</TableCell>
                  <TableCell>
                    <Badge variant={r.primary_entity_status === "LINKED" ? "default" : r.primary_entity_status === "LEGACY" ? "secondary" : "destructive"}>
                      {r.primary_entity_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.legal_case_status === "LINKED" ? "default" : "outline"}>
                      {r.legal_case_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{r.parties_count}</TableCell>
                  <TableCell className="text-right">{r.documents_count}</TableCell>
                  <TableCell>{r.routing_result}</TableCell>
                  <TableCell>{r.assignment_result}</TableCell>
                  <TableCell>
                    {r.issues.length === 0 ? (
                      <span className="text-success">✓ OK</span>
                    ) : (
                      <ul className="list-disc pl-4 text-destructive text-xs">
                        {r.issues.map((i, idx) => <li key={idx}>{i}</li>)}
                      </ul>
                    )}
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
