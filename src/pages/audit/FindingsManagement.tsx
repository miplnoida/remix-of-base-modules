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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const [formData, setFormData] = useState({
    findingId: "",
    title: "",
    condition: "",
    criteria: "",
    cause: "",
    effect: "",
    riskRating: "Medium" as "High" | "Medium" | "Low",
    impactArea: "Operational" as Finding["impactArea"],
    departmentId: "",
    functionArea: "",
    workingPaperIds: [] as string[],
  });

  const filteredFindings = findings.filter((finding) => {
    const matchesSearch =
      finding.findingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      finding.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === "all" || finding.riskRating === riskFilter;
    const matchesStatus = statusFilter === "all" || finding.status === statusFilter;
    return matchesSearch && matchesRisk && matchesStatus;
  });

  const getLinkedWorkingPapers = (findingId: string) => {
    return workingPapers.filter((wp) => wp.linkedFindingIds?.includes(findingId));
  };

  const handleCreate = () => {
    // Critical validation: Finding must have at least one linked Working Paper
    if (formData.workingPaperIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "A finding cannot be created without at least one linked Working Paper",
        variant: "destructive",
      });
      return;
    }

    if (!formData.findingId || !formData.title || !formData.condition) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Finding created successfully with ${formData.workingPaperIds.length} linked Working Paper(s)`,
    });
    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = (finding: Finding) => {
    setSelectedFinding(finding);
    const linkedWPs = getLinkedWorkingPapers(finding.id);
    setFormData({
      findingId: finding.findingId,
      title: finding.title,
      condition: finding.condition,
      criteria: finding.criteria,
      cause: finding.cause,
      effect: finding.effect,
      riskRating: finding.riskRating,
      impactArea: finding.impactArea,
      departmentId: finding.departmentId || "",
      functionArea: finding.functionArea || "",
      workingPaperIds: linkedWPs.map((wp) => wp.id),
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (formData.workingPaperIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "A finding must have at least one linked Working Paper",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Finding updated successfully with audit trail logged",
    });
    setIsEditOpen(false);
    resetForm();
  };

  const handlePreview = (finding: Finding) => {
    setSelectedFinding(finding);
    setIsPreviewOpen(true);
  };

  const resetForm = () => {
    setFormData({
      findingId: "",
      title: "",
      condition: "",
      criteria: "",
      cause: "",
      effect: "",
      riskRating: "Medium",
      impactArea: "Operational",
      departmentId: "",
      functionArea: "",
      workingPaperIds: [],
    });
    setSelectedFinding(null);
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
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      Draft: "secondary",
      "For Mgmt Response": "outline",
      "Under Review": "outline",
      Agreed: "default",
      "Not Agreed": "secondary",
      Finalized: "default",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const FindingForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Required:</strong> Each finding must be supported by at least one Working Paper to ensure audit credibility and traceability.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="findingId">
            Finding ID <span className="text-destructive">*</span>
          </Label>
          <Input
            id="findingId"
            placeholder="F-2025-001"
            value={formData.findingId}
            onChange={(e) => setFormData({ ...formData, findingId: e.target.value })}
            disabled={isEdit}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="riskRating">Risk Rating</Label>
          <Select value={formData.riskRating} onValueChange={(value: any) => setFormData({ ...formData, riskRating: value })}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Finding title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="departmentId">Department</Label>
        <Select value={formData.departmentId} onValueChange={(value) => setFormData({ ...formData, departmentId: value })}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="condition">
          Condition (What was found?) <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="condition"
          placeholder="Describe what was found during the audit..."
          value={formData.condition}
          onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="criteria">Criteria (What should be?)</Label>
        <Textarea
          id="criteria"
          placeholder="State the policy, standard, or best practice..."
          value={formData.criteria}
          onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cause">Cause (Why did this occur?)</Label>
        <Textarea
          id="cause"
          placeholder="Explain the root cause..."
          value={formData.cause}
          onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="effect">Effect (What is the impact?)</Label>
        <Textarea
          id="effect"
          placeholder="Describe the consequences or impact..."
          value={formData.effect}
          onChange={(e) => setFormData({ ...formData, effect: e.target.value })}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="impactArea">Impact Area</Label>
        <Select value={formData.impactArea} onValueChange={(value: any) => setFormData({ ...formData, impactArea: value })}>
          <SelectTrigger className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="Financial">Financial</SelectItem>
            <SelectItem value="Compliance">Compliance</SelectItem>
            <SelectItem value="Operational">Operational</SelectItem>
            <SelectItem value="IT">IT</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4" />
          Link Working Papers <span className="text-destructive">* (Required: At least 1)</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          Select one or more Working Papers that support this finding
        </p>
        <Select
          onValueChange={(value) => {
            if (!formData.workingPaperIds.includes(value)) {
              setFormData({ ...formData, workingPaperIds: [...formData.workingPaperIds, value] });
            }
          }}
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Select working paper to link" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {workingPapers.map((wp) => (
              <SelectItem key={wp.id} value={wp.id}>
                {wp.workingPaperId} - {wp.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.workingPaperIds.map((wpId) => {
            const wp = workingPapers.find((w) => w.id === wpId);
            return (
              <Badge key={wpId} variant="secondary" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {wp?.workingPaperId}
                <button
                  onClick={() =>
                    setFormData({
                      ...formData,
                      workingPaperIds: formData.workingPaperIds.filter((id) => id !== wpId),
                    })
                  }
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            );
          })}
        </div>
        {formData.workingPaperIds.length === 0 && (
          <p className="text-sm text-destructive">⚠ At least one Working Paper must be linked</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={() => (isEdit ? setIsEditOpen(false) : setIsCreateOpen(false))}>
          Cancel
        </Button>
        <Button onClick={isEdit ? handleUpdate : handleCreate} disabled={formData.workingPaperIds.length === 0}>
          {isEdit ? "Update" : "Create"} Finding
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                Document a new audit finding using the 5C methodology. Must be supported by at least one Working Paper.
              </DialogDescription>
            </DialogHeader>
            <FindingForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
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

      {/* Search and Filter */}
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
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="For Mgmt Response">For Mgmt Response</SelectItem>
                <SelectItem value="Finalized">Finalized</SelectItem>
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
                        <Button variant="ghost" size="sm" onClick={() => handlePreview(finding)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(finding)}>
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Finding</DialogTitle>
            <DialogDescription>Update finding details. Must maintain at least one Working Paper link.</DialogDescription>
          </DialogHeader>
          <FindingForm isEdit />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finding: {selectedFinding?.findingId}</DialogTitle>
            <DialogDescription>Complete finding details with supporting Working Papers</DialogDescription>
          </DialogHeader>

          {selectedFinding && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Title</Label>
                  <p className="font-medium">{selectedFinding.title}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Risk Rating</Label>
                  <div className="mt-1">{getRiskBadge(selectedFinding.riskRating)}</div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Department</Label>
                <p className="mt-1">{selectedFinding.departmentName || "-"}</p>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">5C Methodology</h3>
                
                <div>
                  <Label className="text-muted-foreground">Condition (What Was Found)</Label>
                  <p className="mt-1">{selectedFinding.condition}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Criteria (What Should Be)</Label>
                  <p className="mt-1">{selectedFinding.criteria}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Cause</Label>
                  <p className="mt-1">{selectedFinding.cause}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Effect</Label>
                  <p className="mt-1">{selectedFinding.effect}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Supporting Working Papers ({getLinkedWorkingPapers(selectedFinding.id).length})
                </Label>
                <div className="mt-2 space-y-2">
                  {getLinkedWorkingPapers(selectedFinding.id).map((wp) => (
                    <div key={wp.id} className="flex items-center gap-2 p-3 border rounded bg-muted/50">
                      <FileText className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{wp.workingPaperId}</p>
                        <p className="text-sm text-muted-foreground">{wp.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Evidence Links: {wp.evidenceIds.length} | Prepared by: {wp.preparedBy}
                        </p>
                      </div>
                      <Badge variant="outline">{wp.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedFinding.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created By</Label>
                  <p className="font-medium">{selectedFinding.createdBy}</p>
                  <p className="text-xs text-muted-foreground">{selectedFinding.createdDate}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsPreviewOpen(false);
                    handleEdit(selectedFinding);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FindingsManagement;
