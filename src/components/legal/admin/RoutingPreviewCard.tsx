import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Target } from "lucide-react";
import { resolveRouting, type RoutingDecision } from "@/services/legal/lgRoutingService";

const NONE = "__none__";

const SOURCES = [
  "COMPLIANCE_REFERRAL",
  "MANUAL_EMPLOYER",
  "MANUAL_IP",
  "LEGACY",
];

export default function RoutingPreviewCard({
  caseTypes,
  stages,
}: {
  caseTypes: string[];
  stages: string[];
}) {
  const [source, setSource] = useState<string>(NONE);
  const [caseType, setCaseType] = useState<string>(NONE);
  const [stage, setStage] = useState<string>(NONE);
  const [result, setResult] = useState<RoutingDecision | null>(null);
  const [busy, setBusy] = useState(false);

  const sortedTypes = useMemo(() => [...caseTypes].sort(), [caseTypes]);
  const sortedStages = useMemo(() => [...stages].sort(), [stages]);

  async function runPreview() {
    setBusy(true);
    try {
      const dec = await resolveRouting({
        source_code: source === NONE ? null : source,
        case_type_code: caseType === NONE ? null : caseType,
        stage_code: stage === NONE ? null : stage,
      });
      setResult(dec);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" /> Routing Preview
        </CardTitle>
        <CardDescription>
          Simulate a routing decision against current rules and precedence — see which rule matched and where the
          case would land.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label>Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Any —</SelectItem>
                {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Case Type</Label>
            <Select value={caseType} onValueChange={setCaseType}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Any —</SelectItem>
                {sortedTypes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Any —</SelectItem>
                {sortedStages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Button onClick={runPreview} disabled={busy} className="w-full">
              <Play className="h-4 w-4 mr-2" />{busy ? "Resolving…" : "Run Preview"}
            </Button>
          </div>
        </div>

        {result && (
          <div className="rounded-md border p-4 bg-muted/40 space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={result.used_fallback ? "destructive" : "default"}>
                {result.matched_rule}
              </Badge>
              <span className="text-muted-foreground">{result.matched_rule_label}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <Field label="Workbasket" value={result.workbasket_code} />
              <Field label="Team" value={result.team_code} />
              <Field label="Strategy" value={result.assignment_strategy ?? "—"} />
              <Field label="Priority" value={result.priority_code ?? "—"} />
              <Field label="Auto-assign" value={result.auto_assign ? "Yes" : "No"} />
              <Field label="Used Fallback" value={result.used_fallback ? "Yes" : "No"} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}
