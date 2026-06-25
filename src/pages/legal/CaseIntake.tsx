import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { FileText, MessageSquare, Inbox, CheckCircle2, MailCheck } from "lucide-react";
import {
  LgDataGrid,
  LgStatusBadge,
  buildLgRowActions,
  type LgColumnDef,
} from "@/components/legal/grid";
import {
  listIntakes,
  listIntakeSources,
  listMatterTypes,
  type LgCaseIntake,
  type ReferenceOption,
} from "@/services/legal/lgIntakeService";
import { toast } from "sonner";

export default function CaseIntake() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LgCaseIntake[]>([]);
  const [sources, setSources] = useState<ReferenceOption[]>([]);
  const [matterTypes, setMatterTypes] = useState<ReferenceOption[]>([]);
  const [status, setStatus] = useState<string>("ALL");
  const [source, setSource] = useState<string>("ALL");
  const [matterType, setMatterType] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, b, c] = await Promise.all([
          listIntakes({ status: status as any, source: source as any, matterType: matterType as any }),
          listIntakeSources(),
          listMatterTypes(),
        ]);
        setRows(a);
        setSources(b);
        setMatterTypes(c);
      } catch (e: any) {
        toast.error("Failed to load intakes", { description: e?.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [status, source, matterType]);

  const matterLabel = useMemo(() => {
    const m = new Map(matterTypes.map((x) => [x.code, x.display_name]));
    return (code: string) => m.get(code) ?? code;
  }, [matterTypes]);
  const sourceLabel = useMemo(() => {
    const m = new Map(sources.map((x) => [x.code, x.display_name]));
    return (code: string) => m.get(code) ?? code;
  }, [sources]);

  const counts = useMemo(() => {
    const c = { total: rows.length, pending: 0, info: 0, responded: 0, accepted: 0 };
    for (const r of rows) {
      if (r.intake_status === "PENDING_REVIEW") c.pending++;
      else if (r.intake_status === "INFO_REQUESTED") c.info++;
      else if (r.intake_status === "INFO_RESPONDED") c.responded++;
      else if (r.intake_status === "ACCEPTED" || r.intake_status === "CASE_CREATED") c.accepted++;
    }
    return c;
  }, [rows]);

  const columns: LgColumnDef<LgCaseIntake>[] = useMemo(
    () => [
      { accessorKey: "intake_no", header: "Intake No", meta: { label: "Intake No", pinLeft: true } },
      {
        accessorKey: "matter_type_code",
        header: "Matter Type",
        meta: { label: "Matter Type" },
        cell: ({ getValue }) => matterLabel(getValue() as string),
      },
      {
        accessorKey: "source_module",
        header: "Source",
        meta: { label: "Source" },
        cell: ({ getValue }) => sourceLabel(getValue() as string),
      },
      {
        accessorKey: "source_reference_no",
        header: "Source Ref",
        meta: { label: "Source Ref" },
        cell: ({ getValue }) => (getValue() as string) || <span className="text-muted-foreground">—</span>,
      },
      {
        id: "primary_entity",
        header: "Primary Entity",
        meta: { label: "Primary Entity" },
        cell: ({ row }) => {
          const r = row.original;
          const label = r.legacy_primary_entity_name ?? (r.primary_entity_id ? `${r.primary_entity_type}` : r.primary_entity_type);
          return (
            <div>
              <div className="text-sm">{label}</div>
              <div className="text-xs text-muted-foreground">{r.primary_entity_type}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "recommended_case_type_code",
        header: "Recommended Case Type",
        meta: { label: "Recommended Case Type" },
        cell: ({ getValue }) => (getValue() as string) || "—",
      },
      {
        accessorKey: "priority_code",
        header: "Priority",
        meta: { label: "Priority" },
      },
      {
        accessorKey: "exposure_amount",
        header: "Amount / Exposure",
        meta: { label: "Amount / Exposure", align: "right" },
        cell: ({ getValue }) => {
          const v = getValue() as number | null;
          return v != null ? <span className="font-medium">${v.toLocaleString()}</span> : "—";
        },
      },
      {
        accessorKey: "intake_status",
        header: "Status",
        meta: { label: "Status" },
        cell: ({ getValue }) => <LgStatusBadge status={(getValue() as string).replace(/_/g, " ")} />,
      },
      { accessorKey: "submitted_by", header: "Submitted By", meta: { label: "Submitted By" } },
      {
        accessorKey: "submitted_at",
        header: "Submitted Date",
        meta: { label: "Submitted Date" },
        cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
      },
    ],
    [matterLabel, sourceLabel],
  );

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Legal Matter Intake</h1>
          <p className="text-muted-foreground">
            Universal intake for employer, insured-person, claim, court, and internal legal matters
          </p>
        </div>
        <div className="flex gap-4">
          <StatCard icon={<Inbox className="h-5 w-5" />} label="Total" value={counts.total} tone="default" />
          <StatCard icon={<FileText className="h-5 w-5" />} label="Pending Review" value={counts.pending} tone="warning" />
          <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Info Requested" value={counts.info} tone="info" />
          <StatCard icon={<MailCheck className="h-5 w-5" />} label="Info Responded" value={counts.responded} tone="success" />
          <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Accepted" value={counts.accepted} tone="success" />
        </div>
      </div>

      <LgDataGrid
        id="lg.matter-intake"
        columns={columns}
        data={rows}
        isLoading={loading}
        searchPlaceholder="Search intakes…"
        exportFilename="legal-matter-intake"
        defaultSort={[{ id: "submitted_at", desc: true }]}
        toolbarFilters={[
          {
            key: "status",
            label: "Status",
            value: status,
            onChange: setStatus,
            options: [
              { value: "ALL", label: "All statuses" },
              { value: "PENDING_REVIEW", label: "Pending Review" },
              { value: "INFO_REQUESTED", label: "Info Requested" },
              { value: "ACCEPTED", label: "Accepted" },
              { value: "CASE_CREATED", label: "Case Created" },
              { value: "REJECTED", label: "Rejected" },
            ],
          },
          {
            key: "source",
            label: "Source",
            value: source,
            onChange: setSource,
            options: [
              { value: "ALL", label: "All sources" },
              ...sources.map((s) => ({ value: s.code, label: s.display_name })),
            ],
          },
          {
            key: "matter_type",
            label: "Matter Type",
            value: matterType,
            onChange: setMatterType,
            options: [
              { value: "ALL", label: "All matter types" },
              ...matterTypes.map((m) => ({ value: m.code, label: m.display_name })),
            ],
          },
        ]}
        rowActions={buildLgRowActions({
          onView: (row: LgCaseIntake) => navigate(`/legal/cases/intake/${row.id}`),
        })}
        onRowClick={(row) => navigate(`/legal/cases/intake/${row.id}`)}
        emptyMessage="No legal matter intakes."
      />
    </div>
  );
}

function StatCard({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: number; tone: "default" | "warning" | "info" | "success" }) {
  const toneClass =
    tone === "warning" ? "border-warning/20 bg-warning/5 text-warning" :
    tone === "info" ? "border-info/20 bg-info/5 text-info" :
    tone === "success" ? "border-success/20 bg-success/5 text-success" :
    "border-border bg-muted/30 text-foreground";
  return (
    <Card className={`p-4 ${toneClass}`}>
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <div className="text-xs font-medium">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
    </Card>
  );
}
