import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Eye, DollarSign, TrendingDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface DelinquentCase {
  caseNumber: string;
  partyName: string;
  territory: "St Kitts" | "Nevis";
  overdueAmount: number;
  daysPastDue: number;
  agingBucket: "0-30" | "31-60" | "61-90" | "90+";
  lastPaymentDate: string;
  assignedOfficer: string;
  courtOrderDate: string;
}

const mockDelinquentCases: DelinquentCase[] = [
  {
    caseNumber: "SSB/LGL/001/2024",
    partyName: "ABC Construction Ltd",
    territory: "St Kitts",
    overdueAmount: 84000,
    daysPastDue: 45,
    agingBucket: "31-60",
    lastPaymentDate: "2024-10-01",
    assignedOfficer: "Officer Smith",
    courtOrderDate: "2024-09-15"
  },
  {
    caseNumber: "SSB/LGL/002/2024",
    partyName: "XYZ Services Inc",
    territory: "Nevis",
    overdueAmount: 53900,
    daysPastDue: 120,
    agingBucket: "90+",
    lastPaymentDate: "",
    assignedOfficer: "Officer Johnson",
    courtOrderDate: "2024-07-20"
  },
  {
    caseNumber: "SSB/LGL/003/2024",
    partyName: "John Doe",
    territory: "St Kitts",
    overdueAmount: 15300,
    daysPastDue: 75,
    agingBucket: "61-90",
    lastPaymentDate: "2024-09-15",
    assignedOfficer: "Officer Williams",
    courtOrderDate: "2024-08-10"
  }
];

const DelinquentCases = () => {
  const [filterTerritory, setFilterTerritory] = useState<string>("all");
  const [filterBucket, setFilterBucket] = useState<string>("all");

  const filteredCases = mockDelinquentCases.filter(delinquent => {
    const matchesTerritory = filterTerritory === "all" || delinquent.territory === filterTerritory;
    const matchesBucket = filterBucket === "all" || delinquent.agingBucket === filterBucket;
    return matchesTerritory && matchesBucket;
  });

  const agingBuckets = {
    "0-30": filteredCases.filter(c => c.agingBucket === "0-30").length,
    "31-60": filteredCases.filter(c => c.agingBucket === "31-60").length,
    "61-90": filteredCases.filter(c => c.agingBucket === "61-90").length,
    "90+": filteredCases.filter(c => c.agingBucket === "90+").length
  };

  const totalOverdue = filteredCases.reduce((sum, c) => sum + c.overdueAmount, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Delinquent Cases"
        subtitle="Cases with overdue payments"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/dashboard" },
          { label: "Case Management", href: "/legal/cases" },
          { label: "Delinquent Cases" }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Overdue</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              EC${totalOverdue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{filteredCases.length} cases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">0-30 Days</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agingBuckets["0-30"]}</div>
            <p className="text-xs text-muted-foreground">Recently overdue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">31-60 Days</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{agingBuckets["31-60"]}</div>
            <p className="text-xs text-muted-foreground">Moderate risk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">61-90 Days</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{agingBuckets["61-90"]}</div>
            <p className="text-xs text-muted-foreground">High risk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">90+ Days</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{agingBuckets["90+"]}</div>
            <p className="text-xs text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Delinquent Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={filterTerritory} onValueChange={setFilterTerritory}>
              <SelectTrigger>
                <SelectValue placeholder="Territory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Territories</SelectItem>
                <SelectItem value="St Kitts">St Kitts</SelectItem>
                <SelectItem value="Nevis">Nevis</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBucket} onValueChange={setFilterBucket}>
              <SelectTrigger>
                <SelectValue placeholder="Aging Bucket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Aging Buckets</SelectItem>
                <SelectItem value="0-30">0-30 Days</SelectItem>
                <SelectItem value="31-60">31-60 Days</SelectItem>
                <SelectItem value="61-90">61-90 Days</SelectItem>
                <SelectItem value="90+">90+ Days</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">Export Report</Button>
          </div>
        </CardContent>
      </Card>

      {/* Delinquent Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Delinquent Cases ({filteredCases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead className="text-right">Overdue Amount</TableHead>
                  <TableHead>Days Past Due</TableHead>
                  <TableHead>Aging Bucket</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Court Order Date</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((delinquent) => (
                  <TableRow key={delinquent.caseNumber}>
                    <TableCell className="font-medium">{delinquent.caseNumber}</TableCell>
                    <TableCell>{delinquent.partyName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{delinquent.territory}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      EC${delinquent.overdueAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={
                        delinquent.daysPastDue > 90 ? "text-destructive font-semibold" :
                        delinquent.daysPastDue > 60 ? "text-orange-600 font-semibold" :
                        delinquent.daysPastDue > 30 ? "text-yellow-600" : ""
                      }>
                        {delinquent.daysPastDue} days
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          delinquent.agingBucket === "90+" ? "destructive" :
                          delinquent.agingBucket === "61-90" ? "default" :
                          "secondary"
                        }
                      >
                        {delinquent.agingBucket} days
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {delinquent.lastPaymentDate || <span className="text-muted-foreground">No payment</span>}
                    </TableCell>
                    <TableCell>{delinquent.courtOrderDate}</TableCell>
                    <TableCell>{delinquent.assignedOfficer}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DelinquentCases;
