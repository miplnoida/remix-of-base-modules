import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, ClipboardCheck } from "lucide-react";
import { useLegalSetupValidation } from "@/hooks/legal/useLegalSetupValidation";

function StatusBadge({ status }: { status: "ok" | "warn" | "fail" }) {
  if (status === "ok") return <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Badge>;
  if (status === "warn") return <Badge variant="secondary" className="bg-amber-100 text-amber-900"><AlertTriangle className="h-3 w-3 mr-1" />Attention</Badge>;
  return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Missing</Badge>;
}

export default function LegalAdminValidationReport() {
  const { data, isLoading, refetch, isFetching } = useLegalSetupValidation();

  const okCount = data?.areas.filter((a) => a.status === "ok").length ?? 0;
  const total = data?.areas.length ?? 0;

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" /> Legal Test Readiness Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configuration completeness across every Legal Admin area. Each row links to the
            screen where the change can be made — no hidden auto-configuration is performed here.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <Badge variant={data.ready ? "default" : "secondary"} className={data.ready ? "bg-emerald-600 hover:bg-emerald-600" : ""}>
              {okCount}/{total} areas ready
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Re-run Validation"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setting Areas</CardTitle>
          <CardDescription>Status, missing items and the screen to fix each item.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[22%]">Setting Area</TableHead>
                  <TableHead className="w-[14%]">Status</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead className="w-[28%]">Missing Items</TableHead>
                  <TableHead className="w-[18%]">Action Required</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.areas.map((a) => (
                  <TableRow key={a.key}>
                    <TableCell className="font-medium">{a.area}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.detail}</TableCell>
                    <TableCell className="text-sm">
                      {a.missing.length === 0
                        ? <span className="text-muted-foreground">—</span>
                        : <ul className="list-disc pl-4 space-y-0.5">{a.missing.map((m) => <li key={m}>{m}</li>)}</ul>}
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link to={a.action.to}>{a.action.label}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Test readiness checks live data only — every fix must be made manually in its own screen
          (Department Profile, Teams &amp; Staff, Routing &amp; Assignment). Re-run validation after
          each change to confirm the area moves to Ready.
        </CardContent>
      </Card>
    </div>
  );
}
