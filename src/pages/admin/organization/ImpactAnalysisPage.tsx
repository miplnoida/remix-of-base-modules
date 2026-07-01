/**
 * Validation → Impact Analysis
 * Pick an entity (letterhead / template / text block / media asset /
 * signature / disclaimer / print footer) and see every row that references
 * it — grouped by scope. Uses the shared reference scanner so results match
 * the safe-delete guard exactly.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Radar, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { WhereUsedPanel } from "@/components/comm/safe-delete/WhereUsedPanel";
import { ENTITY_LABEL, ENTITY_MATCH_KEY, type CommEntityType } from "@/lib/comm/referenceRegistry";

const sb = supabase as any;

const ENTITY_ORDER: CommEntityType[] = [
  "comm_letterhead",
  "core_template",
  "core_text_block",
  "comm_media_asset",
  "comm_email_signature",
  "comm_disclaimer",
  "comm_print_footer",
];

function labelColumnFor(entity: CommEntityType): string {
  if (entity === "core_text_block") return "text_block_code, name";
  if (entity === "core_template") return "code, name";
  if (entity === "comm_letterhead") return "code, name";
  return "id, name";
}

export default function ImpactAnalysisPage() {
  const [entity, setEntity] = useState<CommEntityType>("comm_letterhead");
  const [id, setId] = useState<string | null>(null);
  const [matchKey, setMatchKey] = useState<string | undefined>(undefined);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["impact-picker", entity],
    queryFn: async () => {
      const cols = `id, ${labelColumnFor(entity).includes("id") ? labelColumnFor(entity) : `${labelColumnFor(entity)}`}`;
      const { data, error } = await sb.from(entity).select(cols).limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const options = useMemo(() => rows.map((r) => {
    const code = r.text_block_code ?? r.code ?? null;
    const label = [code, r.name].filter(Boolean).join(" · ") || r.id;
    return { id: r.id, code, label };
  }), [rows]);

  const onPick = (v: string) => {
    const opt = options.find((o) => o.id === v);
    setId(v);
    const mk = ENTITY_MATCH_KEY[entity];
    setMatchKey(mk === "id" ? undefined : (opt?.code ?? undefined));
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-start gap-3">
        <Radar className="h-6 w-6 text-primary mt-1" />
        <div>
          <h1 className="text-2xl font-bold">Impact Analysis</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Pick any communication resource to see every module, template, workflow, assignment and generated
            document that references it. Use this before editing or retiring a resource — if it has references,
            plan a rewrite with the safe-delete flow.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Entity type</Label>
            <Select value={entity} onValueChange={(v) => { setEntity(v as CommEntityType); setId(null); setMatchKey(undefined); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTITY_ORDER.map((e) => <SelectItem key={e} value={e}>{ENTITY_LABEL[e]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Resource</Label>
            <Select value={id ?? ""} onValueChange={onPick} disabled={isLoading || options.length === 0}>
              <SelectTrigger><SelectValue placeholder={isLoading ? "Loading…" : "Select a resource"} /></SelectTrigger>
              <SelectContent>
                {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!id ? (
        <Alert>
          <AlertTitle>Pick a resource</AlertTitle>
          <AlertDescription>Select an entity type and resource above to run the impact scan.</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent className="p-4">
            <WhereUsedPanel entityType={entity} entityId={id} matchKey={matchKey} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
