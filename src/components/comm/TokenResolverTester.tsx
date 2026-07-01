/**
 * Live Token Resolver Test
 * ------------------------
 * Given a token from `core_template_token`, resolve it against a live source
 * record (by entity_type + primary key) and display the resolved value.
 *
 * Resolution strategy (in order):
 *   1. Explicit override in TOKEN_FIELD_MAP (token_code → column)
 *   2. Convention: token_code = "<group>.<field>" → column = <field>
 *   3. Fallback: sample_value with clear "SAMPLE" badge
 *
 * This is an *audit* utility. It never mutates data and it never bypasses
 * the real runtime resolver used by template rendering — it just verifies
 * that the token metadata maps to a real, reachable column.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlayCircle, CheckCircle2, AlertCircle, Info } from "lucide-react";

const sb = supabase as any;

interface Token {
  id: string;
  token_code: string;
  token_label: string | null;
  entity_type: string | null;
  data_type: string | null;
  sample_value: string | null;
  resolver_service: string | null;
  module_code: string | null;
}

/** Known primary-key columns per source table. Extend as needed. */
const PK_MAP: Record<string, string> = {
  au_er_master: "employer_no",
  er_master: "employer_no",
  au_ip_master: "ssn",
  ip_master: "ssn",
  core_organization: "id",
  core_department: "id",
  core_module_profile: "id",
};

/** Explicit token → column overrides when the naming convention doesn't match. */
const TOKEN_FIELD_MAP: Record<string, string> = {
  "employer.legal_name": "legal_name",
  "employer.trading_name": "trading_name",
  "employer.address_line1": "address_line1",
  "employer.employer_no": "employer_no",
  "ip.first_name": "first_name",
  "ip.last_name": "last_name",
  "ip.ssn": "ssn",
  "organization.name": "name",
  "organization.legal_name": "legal_name",
};

type ResolveState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; value: any; column: string; source: "live" | "sample" }
  | { status: "error"; message: string };

export function TokenResolverTester({ tokens }: { tokens: Token[] }) {
  const [tokenId, setTokenId] = useState<string>("");
  const [pkValue, setPkValue] = useState<string>("");
  const [state, setState] = useState<ResolveState>({ status: "idle" });

  const token = useMemo(() => tokens.find((t) => t.id === tokenId), [tokens, tokenId]);
  const pkCol = token?.entity_type ? PK_MAP[token.entity_type] ?? "id" : "id";

  const resolvedColumn = useMemo(() => {
    if (!token) return null;
    if (TOKEN_FIELD_MAP[token.token_code]) return TOKEN_FIELD_MAP[token.token_code];
    const parts = token.token_code.split(".");
    return parts.length > 1 ? parts.slice(1).join("_") : token.token_code;
  }, [token]);

  const run = async () => {
    if (!token) return;
    if (!token.entity_type) {
      setState({
        status: "ok",
        value: token.sample_value,
        column: "(no entity_type)",
        source: "sample",
      });
      return;
    }
    if (!pkValue.trim()) {
      setState({ status: "error", message: `Enter a ${pkCol} value to resolve against.` });
      return;
    }
    setState({ status: "loading" });
    try {
      const col = resolvedColumn!;
      const { data, error } = await sb
        .from(token.entity_type)
        .select(`${pkCol}, ${col}`)
        .eq(pkCol, pkValue.trim())
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setState({ status: "error", message: `No row with ${pkCol} = "${pkValue}" in ${token.entity_type}.` });
        return;
      }
      setState({ status: "ok", value: (data as any)[col], column: col, source: "live" });
    } catch (e: any) {
      // If the column doesn't exist, fall through to sample so users understand the mismatch.
      setState({
        status: "error",
        message: e.message ?? "Resolver failed. Check TOKEN_FIELD_MAP or entity_type.",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-primary" /> Live token resolver test
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Audit-only. Confirms that a token's <code>entity_type</code> + code map to a real column.
          Runtime rendering still goes through the central template resolver.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs">Token</Label>
            <Select value={tokenId} onValueChange={(v) => { setTokenId(v); setState({ status: "idle" }); }}>
              <SelectTrigger><SelectValue placeholder="Pick a token…" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {tokens.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="font-mono text-xs">{`{{${t.token_code}}}`}</span>
                    {t.entity_type ? <span className="text-muted-foreground ml-2 text-[10px]">· {t.entity_type}</span> : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{pkCol} value</Label>
            <Input
              value={pkValue}
              onChange={(e) => setPkValue(e.target.value)}
              placeholder={token?.entity_type ? `e.g. ${pkCol}` : "n/a — no entity"}
              disabled={!token?.entity_type}
            />
          </div>
        </div>

        {token && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
            <div><span className="text-muted-foreground">Entity:</span> <span className="font-mono">{token.entity_type ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Resolves to column:</span> <span className="font-mono">{resolvedColumn}</span></div>
            <div><span className="text-muted-foreground">Data type:</span> {token.data_type ?? "string"}</div>
            {token.resolver_service && (
              <div><span className="text-muted-foreground">Runtime resolver:</span> <span className="font-mono">{token.resolver_service}</span></div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" onClick={run} disabled={!token || state.status === "loading"}>
            {state.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Resolve
          </Button>
          {token?.sample_value && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setState({ status: "ok", value: token.sample_value, column: "(sample)", source: "sample" })}
            >
              Preview sample
            </Button>
          )}
        </div>

        {state.status === "ok" && (
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2">
              {state.source === "live" ? (
                <><CheckCircle2 className="h-4 w-4 text-green-600" /><Badge variant="default" className="text-[10px]">LIVE</Badge></>
              ) : (
                <><Info className="h-4 w-4 text-amber-600" /><Badge variant="secondary" className="text-[10px]">SAMPLE</Badge></>
              )}
              <span className="text-xs text-muted-foreground">Column: <span className="font-mono">{state.column}</span></span>
            </div>
            <div className="text-sm font-mono bg-background border rounded p-2 break-all">
              {state.value === null || state.value === undefined || state.value === "" ? (
                <span className="text-muted-foreground italic">(empty)</span>
              ) : typeof state.value === "object" ? (
                JSON.stringify(state.value, null, 2)
              ) : (
                String(state.value)
              )}
            </div>
          </div>
        )}
        {state.status === "error" && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{state.message}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
