import { useState } from "react";
import { ArrowLeft, Plus, Eye, Edit, AlertTriangle, Link as LinkIcon, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { findings, workingPapers, departments } from "@/data/auditData";
import { Finding } from "@/types/audit";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const FindingsManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const filteredFindings = findings.filter((finding) => {
    const matchesSearch =
      finding.findingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      finding.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === "all" || finding.riskRating === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const getLinkedWorkingPapers = (findingId: string) => {
    return workingPapers.filter((wp) => wp.linkedFindingIds?.includes(findingId));
  };

  const getRiskBadge = (risk: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary"> = {
      High: "destructive",
      Medium: "default",
      Low: "secondary",
    };
    return <Badge variant={variants[risk]}>{risk}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/audit/workbench">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Findings Management</h1>
            <p className="text-muted-foreground">
              Manage audit findings with mandatory Working Paper linkages for full traceability
            </p>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Finding
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create New Finding</DialogTitle>
              <DialogDescription>
                Document a new audit finding. Must be supported by at least one Working Paper.
              </DialogDescription>
            </DialogHeader>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Required:</strong> Each finding must be supported by at least one Working Paper to ensure audit credibility and traceability.
              </AlertDescription>
            </Alert>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{findings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{findings.filter((f) => f.riskRating === "High").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{findings.filter((f) => f.riskRating === "Medium").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{findings.filter((f) => f.riskRating === "Low").length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Findings Repository</CardTitle>
          <CardDescription>All findings backed by Working Papers with full traceability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search by Finding ID or Title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Finding ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Working Papers</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFindings.map((finding) => {
                const linkedWPs = getLinkedWorkingPapers(finding.id);
                return (
                  <TableRow key={finding.id}>
                    <TableCell className="font-medium">{finding.findingId}</TableCell>
                    <TableCell>{finding.title}</TableCell>
                    <TableCell>{finding.departmentName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <FileText className="h-3 w-3" />
                        {linkedWPs.length} WP{linkedWPs.length !== 1 ? "s" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>{getRiskBadge(finding.riskRating)}</TableCell>
                    <TableCell>{getStatusBadge(finding.status)}</TableCell>
                    <TableCell>{finding.createdDate}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FindingsManagement;
