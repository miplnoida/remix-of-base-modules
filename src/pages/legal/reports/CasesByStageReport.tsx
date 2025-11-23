import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExportActions } from "@/components/reports/ExportActions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileText, DollarSign, Calendar } from "lucide-react";

const stageData = [
  { stage: "Filed", count: 12, amount: 450000 },
  { stage: "Judgment", count: 8, amount: 320000 },
  { stage: "Enforcement", count: 5, amount: 180000 },
  { stage: "Closed", count: 15, amount: 0 }
];

const detailedData = [
  { caseNumber: "SSB/LGL/001/2024", party: "ABC Construction", stage: "Judgment Obtained", filedDate: "2024-08-15", judgmentDate: "2024-09-15", amount: 109000, territory: "St Kitts" },
  { caseNumber: "SSB/LGL/002/2024", party: "XYZ Services", stage: "Filed - Awaiting Hearing", filedDate: "2024-09-20", judgmentDate: "", amount: 53900, territory: "Nevis" },
  { caseNumber: "SSB/LGL/003/2024", party: "John Doe", stage: "Enforcement", filedDate: "2024-07-10", judgmentDate: "2024-08-10", amount: 18300, territory: "St Kitts" },
];

const CHART_COLORS = {
  primary: "#009B4C",
  accent: "#2563EB"
};

const CasesByStageReport = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Cases by Legal Stage"
        subtitle="Legal case progression analysis"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/dashboard" },
          { label: "Legal Reports" },
          { label: "Cases by Stage" }
        ]}
      />

      <ExportActions
        reportTitle="Cases by Stage Report"
        fileName="cases-by-stage"
        data={detailedData}
        columns={[
          { header: "Case Number", key: "caseNumber" },
          { header: "Party", key: "party" },
          { header: "Stage", key: "stage" },
          { header: "Territory", key: "territory" },
          { header: "Filed Date", key: "filedDate" },
          { header: "Judgment Date", key: "judgmentDate" },
          { header: "Amount", key: "amount" }
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Cases by Legal Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="stage" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="count" fill={CHART_COLORS.primary} name="Cases" />
              <Bar yAxisId="right" dataKey="amount" fill={CHART_COLORS.accent} name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case Number</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Territory</TableHead>
                <TableHead>Filed Date</TableHead>
                <TableHead>Judgment Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailedData.map((row) => (
                <TableRow key={row.caseNumber}>
                  <TableCell className="font-medium">{row.caseNumber}</TableCell>
                  <TableCell>{row.party}</TableCell>
                  <TableCell><Badge variant="outline">{row.stage}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{row.territory}</Badge></TableCell>
                  <TableCell>{row.filedDate}</TableCell>
                  <TableCell>{row.judgmentDate || "-"}</TableCell>
                  <TableCell className="text-right font-semibold">EC${row.amount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CasesByStageReport;
