
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, Download, Filter, CheckCircle, XCircle, Clock } from "lucide-react";

const OnlineBenefitApplications = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [benefitTypeFilter, setBenefitTypeFilter] = useState("all");

  // Mock data for online applications
  const applications = [
    {
      id: "OBA-2024-001",
      applicantName: "John Doe",
      email: "john.doe@email.com",
      benefitType: "Maternity",
      dateSubmitted: "2024-01-15",
      status: "pending",
      documents: 3,
      amount: "$2,500.00"
    },
    {
      id: "OBA-2024-002",
      applicantName: "Jane Smith",
      email: "jane.smith@email.com",
      benefitType: "Unemployment",
      dateSubmitted: "2024-01-14",
      status: "approved",
      documents: 5,
      amount: "$1,800.00"
    },
    {
      id: "OBA-2024-003",
      applicantName: "Mike Johnson",
      email: "mike.johnson@email.com",
      benefitType: "Work Injury",
      dateSubmitted: "2024-01-13",
      status: "rejected",
      documents: 2,
      amount: "$3,200.00"
    },
    {
      id: "OBA-2024-004",
      applicantName: "Sarah Wilson",
      email: "sarah.wilson@email.com",
      benefitType: "Educational",
      dateSubmitted: "2024-01-12",
      status: "under_review",
      documents: 4,
      amount: "$1,200.00"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "under_review":
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Under Review</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    const matchesBenefitType = benefitTypeFilter === "all" || app.benefitType.toLowerCase() === benefitTypeFilter;
    
    return matchesSearch && matchesStatus && matchesBenefitType;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Online Benefit Applications</h1>
          <p className="text-muted-foreground mt-1">Manage and review online benefit applications submitted through the web portal</p>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={benefitTypeFilter} onValueChange={setBenefitTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by benefit type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Benefit Types</SelectItem>
                <SelectItem value="maternity">Maternity</SelectItem>
                <SelectItem value="unemployment">Unemployment</SelectItem>
                <SelectItem value="work injury">Work Injury</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
                <SelectItem value="death">Death Benefits</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setBenefitTypeFilter("all");
            }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Applications ({filteredApplications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application ID</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Benefit Type</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="font-medium">{application.id}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{application.applicantName}</div>
                      <div className="text-sm text-gray-500">{application.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{application.benefitType}</TableCell>
                  <TableCell>{application.dateSubmitted}</TableCell>
                  <TableCell>{getStatusBadge(application.status)}</TableCell>
                  <TableCell>{application.amount}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{application.documents} files</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnlineBenefitApplications;
