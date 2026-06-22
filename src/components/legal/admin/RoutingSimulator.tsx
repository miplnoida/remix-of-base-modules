import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Target, CheckCircle2, XCircle, MinusCircle, ArrowRight, ShieldCheck, ShieldX } from "lucide-react";
import {
  resolveRouting,
  loadPrecedence,
  type RoutingDecision,
  type PrecedenceRuleType,
} from "@/services/legal/lgRoutingService";
import { checkCaseCreation, type CaseCreationCheck } from "@/services/legal/lgCaseSourceConfigService";
import { useLgSources, useLgSourceAllowance } from "@/hooks/legal/useLgCaseSourceConfig";

const COUNTRY = "SKN";
const NONE = "__none__";

const RULE_LABELS: Record<PrecedenceRuleType, string> = {
  STAGE_CASE_TYPE: "Stage + Case Type",
  STAGE: "Stage only",
  CASE_TYPE: "Case Type only",
  SOURCE_CASE_TYPE: "Source + Case Type",
  SOURCE: "Source only",
  GLOBAL_DEFAULT: "Global Default",
  FALLBACK: "Fallback",
};

export default function RoutingSimulator({
  caseTypes,
  stages,
}: {
  caseTypes: string[];
  stages: string[];
}) {
  const [source, setSource] = useState<string>(NONE);
  const [caseType, setCaseType] = useState<string>(NONE);
  const [stage, setStage] = useState<string>(NONE);
  const [country, setCountry] = useState<string>(COUNTRY);
  const [result, setResult] = useState<RoutingDecision | null>(null);
  const [check, setCheck] = useState<CaseCreationCheck | null>(null);
  const [busy, setBusy] = useState(false);

  const precQ = useQuery({
    queryKey: ["lg_routing_precedence_active", COUNTRY],
    queryFn: () => loadPrecedence(COUNTRY),
  });
  const { data: allSources = [] } = useLgSources(COUNTRY);
  const { data: allowance } = useLgSourceAllowance(source === NONE ? null : source, COUNTRY);

  // When a source is picked, narrow the case-type / stage options to what's allowed.
  const allowedTypes = useMemo(
    () => (allowance?.caseTypes ?? []).map((c) => c.case_type_code),
    [allowance],
  );
  const allowedStages = useMemo(
    () => (allowance?.stages ?? []).filter((s) => s.allowed_as_initial_stage).map((s) => s.stage_code),
    [allowance],
  );

  const typeOptions = source === NONE
    ? [...caseTypes].sort()
    : allowedTypes.length > 0 ? allowedTypes : [...caseTypes].sort();
  const stageOptions = source === NONE
    ? [...stages].sort()
    : allowedStages.length > 0 ? allowedStages : [...stages].sort();

  async function preview() {
    setBusy(true);
    try {
      const [dec, chk] = await Promise.all([
        resolveRouting({
          source_code: source === NONE ? null : source,
          case_type_code: caseType === NONE ? null : caseType,
          stage_code: stage === NONE ? null : stage,
        }),
        source === NONE
          ? Promise.resolve(null)
          : checkCaseCreation({
              source_code: source,
              case_type_code: caseType === NONE ? null : caseType,
              stage_code: stage === NONE ? null : stage,
              country,
            }),
      ]);
      setResult(dec);
      setCheck(chk);
    } finally {
      setBusy(false);
    }
  }

  const precedence = precQ.data ?? [];
  const matchedIdx = result ? precedence.findIndex((p) => p === result.matched_rule) : -1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" /> Routing Simulator
        </CardTitle>
        <CardDescription>
          Test how a case would be routed before saving rule changes. See the matched rule and full evaluation trace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <Label className="text-xs">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Any —</SelectItem>
                {allSources.map((s) => <SelectItem key={s.source_code} value={s.source_code}>{s.source_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Case Type</Label>
            <Select value={caseType} onValueChange={setCaseType}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Any —</SelectItem>
                {typeOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Any —</SelectItem>
                {stageOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SKN">SKN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={preview} disabled={busy} className="h-9">
            <Play className="h-4 w-4 mr-2" />{busy ? "Resolving…" : "Preview Route"}
          </Button>
        </div>

        {check && (
          <div
            className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
              check.allowed
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-destructive/30 bg-destructive/5 text-destructive"
            }`}
          >
            {check.allowed ? <ShieldCheck className="h-4 w-4 mt-0.5" /> : <ShieldX className="h-4 w-4 mt-0.5" />}
            <div className="flex-1">
              <div className="font-medium">{check.allowed ? "Allowed" : "Blocked"}</div>
              <div className="text-xs opacity-90">{check.reason}</div>
              {check.allowed && (check.default_stage_code || check.default_workbasket_code || check.default_team_code) && (
                <div className="text-xs mt-1 opacity-80">
                  Suggested defaults: stage <b>{check.default_stage_code ?? "—"}</b>, workbasket{" "}
                  <b>{check.default_workbasket_code ?? "—"}</b>, team <b>{check.default_team_code ?? "—"}</b>
                </div>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-gradient-to-br from-muted/30 to-transparent p-4 space-y-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Resolved Route</div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={result.used_fallback ? "destructive" : "default"}
                  className="text-xs"
                >
                  {RULE_LABELS[result.matched_rule]}
                </Badge>
                <span className="text-xs text-muted-foreground">{result.matched_rule_label}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="font-mono">{result.workbasket_code}</Badge>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{result.team_code}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <KV label="Strategy" value={result.assignment_strategy ?? "—"} />
                <KV label="Priority" value={result.priority_code ?? "—"} />
                <KV label="Auto-assign" value={result.auto_assign ? "Yes" : "No"} />
                <KV label="Fallback" value={result.used_fallback ? "Yes" : "No"} />
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Rule Evaluation Trace</div>
              <ul className="space-y-1.5 text-sm">
                {precedence.map((p, i) => {
                  const state =
                    matchedIdx === -1
                      ? "skipped"
                      : i < matchedIdx
                      ? "nomatch"
                      : i === matchedIdx
                      ? "match"
                      : "skipped";
                  return (
                    <li key={p} className="flex items-center gap-2">
                      {state === "match" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : state === "nomatch" ? (
                        <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <MinusCircle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      )}
                      <span
                        className={
                          state === "match"
                            ? "font-medium"
                            : state === "skipped"
                            ? "text-muted-foreground/70"
                            : "text-muted-foreground"
                        }
                      >
                        {RULE_LABELS[p]}
                      </span>
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                        {state === "match" ? "matched" : state === "nomatch" ? "no match" : "not evaluated"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono">{value}</div>
    </div>
  );
}
