import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Search, Filter, Eye, DollarSign } from "lucide-react";
import { useState } from "react";

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
    assignedOfficer: "Officer Smith"
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
    assignedOfficer: "Officer Johnson"
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
    assignedOfficer: "Officer Williams"
  }
];

const LegalWorkbench = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTerritory, setFilterTerritory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredSubcases = mockSubcases.filter(subcase => {
    const matchesSearch = 
      subcase.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subcase.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subcase.courtCaseNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTerritory = filterTerritory === "all" || subcase.territory === filterTerritory;
    const matchesStatus = filterStatus === "all" || subcase.legalStatus === filterStatus;
    
    return matchesSearch && matchesTerritory && matchesStatus;
  });

  const totalOutstanding = filteredSubcases.reduce((sum, sub) => sum + sub.outstanding, 0);
  const totalCases = filteredSubcases.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Legal Workbench"
        subtitle="Manage all legal subcases and enforcement actions"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/dashboard" },
          { label: "Legal Workbench" }
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
            <div className="text-2xl font-bold">{totalCases}</div>
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
            <div className="text-2xl font-bold">
              {mockSubcases.filter(s => s.territory === "St Kitts").length}
            </div>
            <p className="text-xs text-muted-foreground">Active cases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nevis</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockSubcases.filter(s => s.territory === "Nevis").length}
            </div>
            <p className="text-xs text-muted-foreground">Active cases</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Legal Subcases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search case number, party, court case..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

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

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Legal Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Filed - Awaiting Hearing">Filed - Awaiting Hearing</SelectItem>
                <SelectItem value="Judgment Obtained">Judgment Obtained</SelectItem>
                <SelectItem value="Enforcement - Garnishment">Enforcement - Garnishment</SelectItem>
                <SelectItem value="Enforcement - Writ">Enforcement - Writ</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legal Subcases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Legal Subcases ({filteredSubcases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead>Court Case No.</TableHead>
                  <TableHead>Legal Status</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Next Hearing</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubcases.map((subcase) => (
                  <TableRow key={subcase.subcaseId}>
                    <TableCell className="font-medium">{subcase.caseNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{subcase.partyName}</div>
                        <div className="text-xs text-muted-foreground">{subcase.partyType}</div>
                      </div>
                    </TableCell>
                    <TableCell>{subcase.subcaseType}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{subcase.territory}</Badge>
                    </TableCell>
                    <TableCell>{subcase.courtCaseNo}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          subcase.legalStatus === "Judgment Obtained" ? "default" :
                          subcase.legalStatus === "Filed - Awaiting Hearing" ? "secondary" :
                          "destructive"
                        }
                      >
                        {subcase.legalStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      EC${subcase.outstanding.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {subcase.nextHearingDate || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>{subcase.assignedOfficer}</TableCell>
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

export default LegalWorkbench;
