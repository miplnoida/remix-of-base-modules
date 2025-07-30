import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Mock data for the table
const mockC3Data = [
  {
    payerId: "EMP001",
    scheduleNo: "SCH-2024-001",
    period: "2024-01",
    dateReceived: "2024-01-15",
    enteredBy: "John Smith",
    verifiedBy: "Jane Doe",
    dateEntered: "2024-01-16",
    dateVerified: "2024-01-17",
    status: "Verified",
    type: "Employer",
    payerName: "ABC Company Ltd",
    cnc3ReportedReceivedBy: "System",
    cnc3ReportedModifiedDate: "2024-01-17",
    cnc3ReportedModifiedBy: "Admin"
  },
  {
    payerId: "SE002",
    scheduleNo: "SCH-2024-002",
    period: "2024-01",
    dateReceived: "2024-01-14",
    enteredBy: "Mike Johnson",
    verifiedBy: "",
    dateEntered: "2024-01-15",
    dateVerified: "",
    status: "Pending",
    type: "Self-Employed",
    payerName: "XYZ Consultancy",
    cnc3ReportedReceivedBy: "System",
    cnc3ReportedModifiedDate: "2024-01-15",
    cnc3ReportedModifiedBy: "Mike Johnson"
  }
];

export default function C3Management() {
  const navigate = useNavigate();
  const [isQueryExpanded, setIsQueryExpanded] = useState(false);
  const [contributionType, setContributionType] = useState("employer");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    regNo: "",
    scheduleNo: "",
    period: "",
    dateReceived: "",
    enteredBy: "",
    verifiedBy: "",
    dateEntered: "",
    status: ""
  });

  const handleAddNewC3 = () => {
    navigate("/c3-management/add");
  };

  const handleSearch = () => {
    // Implement search logic here
    console.log("Searching with filters:", filters);
  };

  const handleReset = () => {
    setFilters({
      regNo: "",
      scheduleNo: "",
      period: "",
      dateReceived: "",
      enteredBy: "",
      verifiedBy: "",
      dateEntered: "",
      status: ""
    });
    setSearchTerm("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">C3 Management</h1>
          <p className="text-muted-foreground">Manage and view C3 contribution records</p>
        </div>
        <Button onClick={handleAddNewC3} className="gap-2">
          <Plus className="h-4 w-4" />
          Add New C3
        </Button>
      </div>

      {/* Query By Section */}
      <Card>
        <Collapsible open={isQueryExpanded} onOpenChange={setIsQueryExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Query By</CardTitle>
                  <CardDescription>Filter and search C3 records</CardDescription>
                </div>
                {isQueryExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Contribution Type Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Contribution Type</Label>
                <RadioGroup 
                  value={contributionType} 
                  onValueChange={setContributionType}
                  className="flex flex-row space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="employer" id="employer" />
                    <Label htmlFor="employer">Employer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="self-employed" id="self-employed" />
                    <Label htmlFor="self-employed">Self-Employed</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="voluntary" id="voluntary" />
                    <Label htmlFor="voluntary">Voluntary Contribution</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Filter Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regNo">Reg No</Label>
                  <Input
                    id="regNo"
                    placeholder="Enter registration number"
                    value={filters.regNo}
                    onChange={(e) => setFilters({ ...filters, regNo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduleNo">Schedule No</Label>
                  <Input
                    id="scheduleNo"
                    placeholder="Auto-populated"
                    value={filters.scheduleNo}
                    onChange={(e) => setFilters({ ...filters, scheduleNo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period">Period</Label>
                  <Input
                    id="period"
                    placeholder="Auto-populated"
                    value={filters.period}
                    onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateReceived">Date Received</Label>
                  <Input
                    id="dateReceived"
                    type="date"
                    value={filters.dateReceived}
                    onChange={(e) => setFilters({ ...filters, dateReceived: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enteredBy">Entered By</Label>
                  <Input
                    id="enteredBy"
                    placeholder="Auto-populated"
                    value={filters.enteredBy}
                    onChange={(e) => setFilters({ ...filters, enteredBy: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verifiedBy">Verified By</Label>
                  <Input
                    id="verifiedBy"
                    placeholder="Auto-populated"
                    value={filters.verifiedBy}
                    onChange={(e) => setFilters({ ...filters, verifiedBy: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateEntered">Date Entered</Label>
                  <Input
                    id="dateEntered"
                    type="date"
                    value={filters.dateEntered}
                    onChange={(e) => setFilters({ ...filters, dateEntered: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={handleSearch} className="gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by Payer Name, Reg No, Status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* C3 Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>C3 Records</CardTitle>
          <CardDescription>Manage and view contribution records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payer ID</TableHead>
                  <TableHead>Schedule No.</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Date Received</TableHead>
                  <TableHead>Entered By</TableHead>
                  <TableHead>Verified By</TableHead>
                  <TableHead>Date Entered</TableHead>
                  <TableHead>Date Verified</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Payer Name</TableHead>
                  <TableHead>CNC3 Received By</TableHead>
                  <TableHead>CNC3 Modified Date</TableHead>
                  <TableHead>CNC3 Modified By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockC3Data.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{record.payerId}</TableCell>
                    <TableCell>{record.scheduleNo}</TableCell>
                    <TableCell>{record.period}</TableCell>
                    <TableCell>{record.dateReceived}</TableCell>
                    <TableCell>{record.enteredBy}</TableCell>
                    <TableCell>{record.verifiedBy || "-"}</TableCell>
                    <TableCell>{record.dateEntered}</TableCell>
                    <TableCell>{record.dateVerified || "-"}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>{record.type}</TableCell>
                    <TableCell>{record.payerName}</TableCell>
                    <TableCell>{record.cnc3ReportedReceivedBy}</TableCell>
                    <TableCell>{record.cnc3ReportedModifiedDate}</TableCell>
                    <TableCell>{record.cnc3ReportedModifiedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}