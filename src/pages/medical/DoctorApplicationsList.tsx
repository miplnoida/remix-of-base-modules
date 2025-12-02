import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
import { 
  Search, 
  Plus, 
  Eye, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Filter
} from "lucide-react";
import { medicalService } from "@/services/medicalService";
import { DoctorApplicationStatus } from "@/types/medical";
import { format } from "date-fns";

const statusConfig: Record<DoctorApplicationStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  'Draft': { label: 'Draft', variant: 'secondary', icon: FileText },
  'Submitted': { label: 'Submitted', variant: 'default', icon: Clock },
  'Manual-Entered': { label: 'Manual Entry', variant: 'outline', icon: FileText },
  'Under-Review': { label: 'Under Review', variant: 'default', icon: Eye },
  'More-Info-Requested': { label: 'More Info', variant: 'outline', icon: AlertCircle },
  'Approved': { label: 'Approved', variant: 'default', icon: CheckCircle },
  'Rejected': { label: 'Rejected', variant: 'destructive', icon: XCircle },
};

export default function DoctorApplicationsList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['doctor-applications'],
    queryFn: () => medicalService.getApplications(),
  });

  const { data: stats } = useQuery({
    queryKey: ['doctor-application-stats'],
    queryFn: () => medicalService.getApplicationStats(),
  });

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    const matchesType = typeFilter === "all" || app.applicationType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: DoctorApplicationStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Doctor Applications</h1>
          <p className="text-muted-foreground mt-1">
            Manage doctor registration applications for benefit referrals
          </p>
        </div>
        <Button onClick={() => navigate('/medical/applications/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Manual Application
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-blue-500">Submitted</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-500">{stats?.submitted || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-amber-500">Under Review</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-500">{stats?.underReview || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-orange-500">More Info</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-500">{stats?.moreInfoRequested || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-500">Approved</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-500">{stats?.approved || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-red-500">Rejected</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-500">{stats?.rejected || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-purple-500">Manual</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-purple-500">{stats?.manualEntered || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Manual-Entered">Manual Entry</SelectItem>
                <SelectItem value="Under-Review">Under Review</SelectItem>
                <SelectItem value="More-Info-Requested">More Info Requested</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Applications ({filteredApplications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference No.</TableHead>
                  <TableHead>Doctor Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading applications...
                    </TableCell>
                  </TableRow>
                ) : filteredApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No applications found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApplications.map((app) => (
                    <TableRow key={app.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">{app.referenceNumber}</TableCell>
                      <TableCell className="font-medium">
                        {app.title} {app.firstName} {app.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{app.email}</TableCell>
                      <TableCell>
                        <Badge variant={app.applicationType === 'Online' ? 'secondary' : 'outline'}>
                          {app.applicationType}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(app.submittedDate), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {app.assignedReviewerName || (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/medical/applications/${app.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
