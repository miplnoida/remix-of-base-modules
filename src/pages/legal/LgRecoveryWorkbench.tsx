import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLgCases, useLgReference } from "@/hooks/legal/useLgCases";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { PageShell } from "@/components/common/PageShell";
import {
  LgDataGrid,
  LgStatusBadge,
  type LgColumnDef,
  type LgRowAction,
} from "@/components/legal/grid";
import { Eye, Wallet } from "lucide-react";
import type { LgCase } from "@/services/legal/lgCaseService";
import { formatDateForDisplay } from "@/lib/format-config";

/**
 * Phase 2 — Legal Recovery Workbench.
 *
 * Standalone queue focused on money recovery (arrears, overpayments, court
 * costs). All figures are read from live `lg_case` fields — no mocks and no
 * per-row RPC calls (recovery detail is on the case Recovery tab).
 *
 * Buckets (URL: /legal/lg/recovery?bucket=…):
 *  - active    Any open case with a positive outstanding balance.
 *  - overdue   Missed hearing / breached arrangement snapshot.
 *  - settled   Fully paid or SETTLED status.
 *  - all       Everything (fallback).
 */

type Bucket = "active" | "overdue" | "settled" | "all";

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "active", label: "Active recovery" },
  { id: "overdue", label: "Overdue / at risk" },
  { id: "settled", label: "Settled / closed" },
  { id: "all", label: "All cases" },
];

function isOpen(c: LgCase) {
  return c.status_code !== "CLOSED" && c.status_code !== "SETTLED" && c.status_code !== "WITHDRAWN";
}

function outstandingOf(c: LgCase): number {
  return Number(c.outstanding_amount_snapshot ?? (c as any).total_outstanding ?? 0);
}

function claimOf(c: LgCase): number {
  return Number((c as any).claim_amount ?? 0);
}

function recoveryPct(c: LgCase): number {
  const claim = claimOf(c);
  const outstanding = outstandingOf(c);
  if (!claim || claim <= 0) return 0;
  const recovered = Math.max(0, claim - outstanding);
  return Math.min(100, Math.round((recovered / claim) * 100));
}

export default function LgRecoveryWorkbench() {
  const navigate = useNavigate();
  const access = useLgAccess();
  const [params, setParams] = useSearchParams();
  const bucket = (params.get("bucket") as Bucket) || "active";
  const search = params.get("q") ?? "";

  const { data: cases = [], isLoading, isError, error } = useLgCases({
    search: search || undefined,
  });
  const { data: stages = [] } = useLgReference("LG_CASE_STAGE");

  const stageLabel = useMemo(
    () => (code?: string | null) => (code ? (stages.find((s) => s.code === code)?.label ?? code) : "—"),
    [stages],
  );

  const filtered = useMemo(() => {
    switch (bucket) {
      case "active":
        return cases.filter((c) => isOpen(c) && outstandingOf(c) > 0);
      case "overdue":
        return cases.filter(
          (c) =>
            isOpen(c) &&
            outstandingOf(c) > 0 &&
            (c.next_hearing_date ? new Date(c.next_hearing_date) < new Date() : false),
        );
      case "settled":
        return cases.filter((c) => !isOpen(c) || outstandingOf(c) === 0);
      case "all":
      default:
        return cases;
    }
  }, [cases, bucket]);

  const setBucket = (b: Bucket) => {
    const next = new URLSearchParams(params);
    next.set("bucket", b);
    setParams(next, { replace: true });
  };

  const columns: LgColumnDef<LgCase>[] = useMemo(
    () => [
      {
        accessorKey: "lg_case_no",
        header: "Case No",
        meta: { label: "Case No", pinLeft: true, width: 150 },
      },
      { accessorKey: "case_type_code", header: "Type", meta: { label: "Type", width: 110 } },
      {
        accessorKey: "current_stage_code",
        header: "Stage",
        meta: { label: "Stage", width: 150 },
        cell: ({ getValue }) => stageLabel(getValue<string>()),
      },
      {
        accessorKey: "status_code",
        header: "Status",
        meta: { label: "Status", width: 120 },
        cell: ({ getValue }) => <LgStatusBadge status={getValue<string>()} />,
      },
      {
        id: "claim",
        header: "Claim",
        meta: { label: "Claim", align: "right", width: 120 },
        cell: ({ row }) => claimOf(row.original).toFixed(2),
      },
      {
        id: "outstanding",
        header: "Outstanding",
        meta: { label: "Outstanding", align: "right", width: 130 },
        cell: ({ row }) => outstandingOf(row.original).toFixed(2),
      },
      {
        id: "recovery_pct",
        header: "Recovery %",
        meta: { label: "Recovery %", align: "right", width: 110 },
        cell: ({ row }) => `${recoveryPct(row.original)}%`,
      },
      {
        accessorKey: "next_hearing_date",
        header: "Next Hearing",
        meta: { label: "Next Hearing", width: 130 },
        cell: ({ getValue }) => {
          const v = getValue<string | null>();
          return v ? formatDateForDisplay(v) : "—";
        },
      },
      {
        accessorKey: "assigned_officer_id",
        header: "Officer",
        meta: { label: "Officer", width: 140, defaultHidden: true },
        cell: ({ getValue }) => (getValue<string | null>() ?? "—"),
      },
    ],
    [stageLabel],
  );

  const totals = useMemo(() => {
    const claim = filtered.reduce((s, c) => s + claimOf(c), 0);
    const outstanding = filtered.reduce((s, c) => s + outstandingOf(c), 0);
    const recovered = Math.max(0, claim - outstanding);
    const pct = claim > 0 ? Math.round((recovered / claim) * 100) : 0;
    return { claim, outstanding, recovered, pct };
  }, [filtered]);

  const summary = [
    { label: "Cases", value: filtered.length, tone: "default" as const },
    { label: "Claim", value: totals.claim.toFixed(2), tone: "info" as const },
    { label: "Outstanding", value: totals.outstanding.toFixed(2), tone: "danger" as const },
    { label: "Recovered", value: totals.recovered.toFixed(2), tone: "success" as const },
    { label: "Recovery %", value: `${totals.pct}%`, tone: "info" as const },
  ];

  const rowActions = buildLgRowActions<LgCase>([
    {
      label: "Open Recovery Tab",
      onClick: (row) => navigate(`/legal/lg/cases/${row.id}?tab=recovery`),
    },
    {
      label: "Open Case",
      onClick: (row) => navigate(`/legal/lg/cases/${row.id}`),
    },
  ]);

  return (
    <PageShell
      title="Recovery Workbench"
      subtitle="Live view of outstanding balances, recovery progress and at-risk cases."
      breadcrumbs={[
        { label: "Legal", href: "/legal/lg/dashboard" },
        { label: "Recovery" },
      ]}
      isLoading={isLoading}
      error={isError ? (error as Error)?.message ?? "Failed to load cases" : null}
      noPermission={!access.canViewCases}
    >
      <div className="flex flex-wrap gap-2">
        {BUCKETS.map((b) => (
          <button
            key={b.id}
            onClick={() => setBucket(b.id)}
            className={`px-3 py-1.5 text-sm rounded-md border transition ${
              bucket === b.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      <LgDataGrid
        id="recovery-workbench"
        columns={columns}
        data={filtered}
        summary={summary}
        rowActions={rowActions}
        emptyMessage="No cases match this recovery bucket."
        exportFilename={`recovery-${bucket}`}
        toolbarFilters={[
          {
            id: "q",
            label: "Search",
            type: "search",
            value: search,
            onChange: (v: string) => {
              const next = new URLSearchParams(params);
              if (v) next.set("q", v);
              else next.delete("q");
              setParams(next, { replace: true });
            },
          },
        ]}
      />
    </PageShell>
  );
}
