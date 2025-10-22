import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  DollarSign, 
  FileText, 
  AlertTriangle,
  TrendingDown,
  Search,
  Download,
  Filter,
  Calendar
} from "lucide-react";
import { useState } from "react";
import { useBemaArrears } from "@/hooks/useBemaData";

interface ArrearsEntry {
  id: string;
  employerId: string;
  employerName: string;
  totalArrears: number;
  aged30: number;
  aged60: number;
  aged90: number;
  aged120Plus: number;
  lastPayment: string;
  status: "current" | "arrangement" | "legal" | "defaulted";
}

const mockArrears: ArrearsEntry[] = [
  {
    id: "ARR-001",
    employerId: "EMP-1001",
    employerName: "Caribbean Hotel Group",
    totalArrears: 125678.90,
    aged30: 25000,
    aged60: 35678.90,
    aged90: 40000,
    aged120Plus: 25000,
    lastPayment: "2024-12-15",
    status: "arrangement",
  },
  {
    id: "ARR-002",
    employerId: "EMP-1002",
    employerName: "Construction Pro Ltd",
    totalArrears: 89450.00,
    aged30: 15000,
    aged60: 20450,
    aged90: 30000,
    aged120Plus: 24000,
    lastPayment: "2024-11-20",
    status: "legal",
  },
  {
    id: "ARR-003",
    employerId: "EMP-1003",
    employerName: "Tech Solutions Inc",
    totalArrears: 45200.50,
    aged30: 45200.50,
    aged60: 0,
    aged90: 0,
    aged120Plus: 0,
    lastPayment: "2025-01-10",
    status: "current",
  },
];

const getStatusBadge = (status: ArrearsEntry["status"]) => {
  const config = {
    current: { variant: "outline" as const, label: "Current" },
    arrangement: { variant: "secondary" as const, label: "Payment Plan" },
    legal: { variant: "destructive" as const, label: "Legal Action" },
    defaulted: { variant: "destructive" as const, label: "Defaulted" },
  };
  
  return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
};

export default function ArrearsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: arrearsData } = useBemaArrears();

  const totalOutstanding = mockArrears.reduce((sum, item) => sum + item.totalArrears, 0);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Arrears & Payment Arrangements</h1>
          <p className="text-muted-foreground">Track arrears, manage payment plans, and monitor recovery</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Generate Statement</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all employers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">43</div>
            <p className="text-xs text-muted-foreground">Payment arrangements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Legal Referrals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">Escalated cases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67%</div>
            <p className="text-xs text-muted-foreground">This quarter</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by employer name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Arrears List */}
      <Tabs defaultValue="all">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="all">All Arrears</TabsTrigger>
          <TabsTrigger value="current">Current</TabsTrigger>
          <TabsTrigger value="arrangement">Payment Plans</TabsTrigger>
          <TabsTrigger value="legal">Legal Action</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {mockArrears.map((arrear) => (
            <Card key={arrear.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div>
                        <h3 className="font-semibold">{arrear.employerName}</h3>
                        <p className="text-sm text-muted-foreground">{arrear.employerId}</p>
                      </div>
                      {getStatusBadge(arrear.status)}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Arrears</span>
                        <span className="text-lg font-bold">${arrear.totalArrears.toLocaleString()}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="p-2 rounded-lg bg-muted">
                          <p className="text-muted-foreground">0-30 days</p>
                          <p className="font-medium">${arrear.aged30.toLocaleString()}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted">
                          <p className="text-muted-foreground">31-60 days</p>
                          <p className="font-medium">${arrear.aged60.toLocaleString()}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted">
                          <p className="text-muted-foreground">61-90 days</p>
                          <p className="font-medium">${arrear.aged90.toLocaleString()}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted">
                          <p className="text-muted-foreground">120+ days</p>
                          <p className="font-medium">${arrear.aged120Plus.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="text-sm">
                        <span className="text-muted-foreground">Last Payment: </span>
                        <span className="font-medium">{arrear.lastPayment}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row lg:flex-col gap-2">
                    <Button variant="outline" size="sm" className="flex-1 lg:flex-none gap-1">
                      <FileText className="h-3 w-3" />
                      Statement
                    </Button>
                    {arrear.status === "current" && (
                      <Button size="sm" className="flex-1 lg:flex-none">Create Plan</Button>
                    )}
                    {arrear.status === "arrangement" && (
                      <Button variant="outline" size="sm" className="flex-1 lg:flex-none">View Plan</Button>
                    )}
                    {arrear.status === "legal" && (
                      <Button variant="destructive" size="sm" className="flex-1 lg:flex-none">Legal Case</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="current">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">Current arrears will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arrangement">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">Payment plans will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">Legal cases will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}