/**
 * EPIC-09A Phase 2 — Generic Legal Report Runner
 *
 * Route: /legal/reports/run/:code
 * Resolves the report definition by code, fetches rows via REPORT_FETCHERS,
 * applies filter panel, and renders the shared ReportViewer with drilldown
 * to the canonical Legal V1 screen from the definition.
 */
import { useMemo, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ReportViewer } from "@/components/legal/reports/ReportViewer";
import { ReportFilters } from "@/components/legal/reports/ReportFilters";
import { getReport } from "@/config/legalReportDefinitions";
import { REPORT_FETCHERS } from "@/services/legal/lgReportFetchers";
import type { LgReportFilters } from "@/services/legal/lgReportingService";
import { useLgAccess } from "@/hooks/legal/useLgAccess";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function LegalReportRunner() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const definition = useMemo(() => getReport(code), [code]);
  const access = useLgAccess();
  const [filters, setFilters] = useState<LgReportFilters>({});

  if (!definition) return <Navigate to="/legal/reports" replace />;
  const capValue = access.can(definition.viewCapability);
  const allowed = capValue !== false;

  if (!allowed) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="pt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4" /> You do not have permission to view this report.
        </CardContent></Card>
      </div>
    );
  }

  const fetcher = REPORT_FETCHERS[definition.code];
  const { data, isLoading } = useQuery({
    queryKey: ["legal-report", definition.code, filters],
    queryFn: () => (fetcher ? fetcher(filters) : Promise.resolve([])),
    enabled: !!fetcher,
    staleTime: 60_000,
  });

  const drilldown = (row: any) => {
    const route = definition.drilldownRoute;
    if (!route) return;
    const id = row.id ?? row.lg_case_id ?? row.case_id;
    if (!id) return;
    navigate(route.replace(":id", id));
  };

  if (!fetcher) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">
          This report is registered but not yet implemented in Phase 2.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <ReportViewer
      definition={definition}
      rows={data ?? []}
      loading={isLoading}
      activeFilters={filters}
      filterPanel={<ReportFilters filterKeys={definition.filters} value={filters} onChange={setFilters} />}
      onDrilldown={definition.drilldownRoute ? drilldown : undefined}
    />
  );
}
