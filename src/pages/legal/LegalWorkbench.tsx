import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, DollarSign } from "lucide-react";
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from "@/components/legal/grid";
import { useLegalEnterpriseLabels } from "@/hooks/legal/useLegalEnterpriseLabels";

interface LegalSubcase {
  subcaseId: string;
  caseId: string;
  caseNumber: string;
  partyName: string;
  partyType: "Employer" | "Insured Person";
  subcaseType: string;
  territory: "St Kitts" | "Nevis";
  legalStatus: string;
  courtCaseNo: string;
  court: string;
  principal: number;
  interest: number;
  penalties: number;
  courtCosts: number;
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  lastHearingDate: string;
  nextHearingDate: string;
  assignedOfficer: string;
}

const mockSubcases: LegalSubcase[] = [
  {
    subcaseId: "SUB-001",
    caseId: "CASE-2024-001",
    caseNumber: "SSB/LGL/001/2024",
    partyName: "ABC Construction Ltd",
    partyType: "Employer",
    subcaseType: "Contribution Arrears",
    territory: "St Kitts",
    legalStatus: "Judgment Obtained",
    courtCaseNo: "SUIT-45/2024",
    court: "High Court - St Kitts",
    principal: 85000,
    interest: 12000,
    penalties: 8500,
    courtCosts: 3500,
    totalDue: 109000,
    totalPaid: 25000,
    outstanding: 84000,
    lastHearingDate: "2024-11-15",
    nextHearingDate: "2024-12-10",
    assignedOfficer: "Officer Smith",
  },
  {
    subcaseId: "SUB-002",
    caseId: "CASE-2024-002",
    caseNumber: "SSB/LGL/002/2024",
    partyName: "XYZ Services Inc",
    partyType: "Employer",
    subcaseType: "Contribution Arrears",
    territory: "Nevis",
    legalStatus: "Filed - Awaiting Hearing",
    courtCaseNo: "SUIT-52/2024",
    court: "Magistrate Court - Nevis",
    principal: 42000,
    interest: 5600,
    penalties: 4200,
    courtCosts: 2100,
    totalDue: 53900,
    totalPaid: 0,
    outstanding: 53900,
    lastHearingDate: "",
    nextHearingDate: "2024-12-05",
    assignedOfficer: "Officer Johnson",
  },
  {
    subcaseId: "SUB-003",
    caseId: "CASE-2024-003",
    caseNumber: "SSB/LGL/003/2024",
    partyName: "John Doe",
    partyType: "Insured Person",
    subcaseType: "Benefit Overpayment Recovery",
    territory: "St Kitts",
    legalStatus: "Enforcement - Garnishment",
    courtCaseNo: "SUIT-38/2024",
    court: "High Court - St Kitts",
    principal: 15000,
    interest: 1800,
    penalties: 0,
    courtCosts: 1500,
    totalDue: 18300,
    totalPaid: 3000,
    outstanding: 15300,
    lastHearingDate: "2024-10-20",
    nextHearingDate: "",
    assignedOfficer: "Officer Williams",
  },
];

const STATUSES = [
  "Filed - Awaiting Hearing",
  "Judgment Obtained",
  "Enforcement - Garnishment",
  "Enforcement - Writ",
  "Closed",
];

const LegalWorkbench = () => {
  const [filterTerritory, setFilterTerritory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const labels = useLegalEnterpriseLabels();

  const filteredSubcases = useMemo(
    () =>
      mockSubcases.filter((s) => {
        if (filterTerritory && s.territory !== filterTerritory) return false;
        if (filterStatus && s.legalStatus !== filterStatus) return false;
        return true;
      }),
    [filterTerritory, filterStatus],
  );

  const totalOutstanding = filteredSubcases.reduce((sum, s) => sum + s.outstanding, 0);

  const summary = useMemo(() => [
    { label: "Total Cases", value: filteredSubcases.length, tone: "default" as const },
    { label: "Outstanding", value: `EC$${totalOutstanding.toLocaleString()}`, tone: "danger" as const },
    { label: "St Kitts", value: mockSubcases.filter((s) => s.territory === "St Kitts").length, tone: "info" as const },
    { label: "Nevis", value: mockSubcases.filter((s) => s.territory === "Nevis").length, tone: "muted" as const },
  ], [filteredSubcases, totalOutstanding]);

  const columns: LgColumnDef<LegalSubcase>[] = useMemo(() => [
    { accessorKey: "caseNumber", header: "Case Number", meta: { label: "Case Number", pinLeft: true, width: 170 } },
    {
      accessorKey: "partyName", header: "Party", meta: { label: "Party", width: 200 },
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.partyName}</div>
          <div className="text-xs text-muted-foreground">{row.original.partyType}</div>
        </div>
      ),
    },
    { accessorKey: "subcaseType", header: "Type", meta: { label: "Type", width: 190 } },
    { accessorKey: "territory", header: "Territory", meta: { label: "Territory", width: 110 } },
    { accessorKey: "courtCaseNo", header: "Court Case No.", meta: { label: "Court Case No.", width: 140 } },
    {
      accessorKey: "legalStatus", header: "Legal Status", meta: { label: "Legal Status", width: 200 },
      cell: ({ getValue }) => <LgStatusBadge status={getValue<string>().replace(/\s+/g, "_").toUpperCase()} label={getValue<string>()} />,
    },
    {
      accessorKey: "outstanding", header: "Outstanding", meta: { label: "Outstanding", align: "right", width: 140 },
      cell: ({ getValue }) => `EC$${getValue<number>().toLocaleString()}`,
    },
    {
      accessorKey: "nextHearingDate", header: "Next Hearing", meta: { label: "Next Hearing", width: 130 },
      cell: ({ getValue }) => getValue<string>() || <span className="text-muted-foreground">—</span>,
    },
    { accessorKey: "assignedOfficer", header: "Officer", meta: { label: "Officer", width: 150 } },
  ], []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={`${labels.moduleName} Workbench`}
        subtitle={`Manage all legal subcases and enforcement actions · ${labels.departmentName}`}
        breadcrumbs={[
          { label: `${labels.moduleName} Management`, href: "/legal/dashboard" },
          { label: `${labels.moduleName} Workbench` },
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Legal Cases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSubcases.length}</div>
            <p className="text-xs text-muted-foreground">Active legal subcases</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">EC${totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all legal cases</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">St Kitts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockSubcases.filter((s) => s.territory === "St Kitts").length}</div>
            <p className="text-xs text-muted-foreground">Active cases</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nevis</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockSubcases.filter((s) => s.territory === "Nevis").length}</div>
            <p className="text-xs text-muted-foreground">Active cases</p>
          </CardContent>
        </Card>
      </div>

      <LgDataGrid
        id="lg.workbench"
        columns={columns}
        data={filteredSubcases}
        getRowId={(r) => r.subcaseId}
        searchPlaceholder="Search case number, party, court case…"
        summary={summary}
        defaultSort={[{ id: "nextHearingDate", desc: false }]}
        toolbarFilters={[
          {
            key: "territory", label: "Territory", value: filterTerritory, onChange: setFilterTerritory,
            options: ["St Kitts", "Nevis"].map((v) => ({ value: v, label: v })),
          },
          {
            key: "status", label: "Legal Status", value: filterStatus, onChange: setFilterStatus,
            options: STATUSES.map((v) => ({ value: v, label: v })),
          },
        ]}
        rowActions={buildLgRowActions<LegalSubcase>({
          onView: (r) => console.log("View subcase", r.subcaseId),
        })}
        emptyMessage="No legal subcases match the current filters."
        exportFilename="legal-workbench"
      />
    </div>
  );
};

export default LegalWorkbench;
