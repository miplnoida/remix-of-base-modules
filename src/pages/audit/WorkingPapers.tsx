import { useState } from "react";
import { ArrowLeft, Plus, Eye, Edit, FileText, Link as LinkIcon } from "lucide-react";
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
import { workingPapers, evidence, findings, departmentAuditPlans, annualAuditPlans } from "@/data/auditData";
import { WorkingPaper } from "@/types/audit";
import { useToast } from "@/hooks/use-toast";

const WorkingPapers = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedWP, setSelectedWP] = useState<WorkingPaper | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    workingPaperId: "",
    title: "",
    description: "",
    objective: "",
    auditArea: "",
    procedure: "",
    testPerformed: "",
    results: "",
    observations: "",
    conclusion: "",
    annualPlanId: "",
    departmentAuditId: "",
    activityId: "",
    evidenceIds: [] as string[],
  });

  const filteredWPs = workingPapers.filter((wp) => {
    const matchesSearch =
      wp.workingPaperId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wp.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || wp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = () => {
    // Validation
    if (!formData.workingPaperId || !formData.title || !formData.objective) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.evidenceIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Each Working Paper must have at least one linked Evidence item",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Working Paper created successfully with audit trail logged",
    });
    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = (wp: WorkingPaper) => {
    setSelectedWP(wp);
    setFormData({
      workingPaperId: wp.workingPaperId,
      title: wp.title,
      description: wp.description,
      objective: wp.objective,
      auditArea: wp.auditArea,
      procedure: wp.procedure,
      testPerformed: wp.testPerformed,
      results: wp.results,
      observations: wp.observations,
      conclusion: wp.conclusion,
      annualPlanId: wp.annualPlanId || "",
      departmentAuditId: wp.departmentAuditId || "",
      activityId: wp.activityId || "",
      evidenceIds: wp.evidenceIds,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (formData.evidenceIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Each Working Paper must have at least one linked Evidence item",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Working Paper updated successfully with audit trail logged",
    });
    setIsEditOpen(false);
    resetForm();
  };

  const handlePreview = (wp: WorkingPaper) => {
    setSelectedWP(wp);
    setIsPreviewOpen(true);
  };

  const resetForm = () => {
    setFormData({
      workingPaperId: "",
      title: "",
      description: "",
      objective: "",
      auditArea: "",
      procedure: "",
      testPerformed: "",
      results: "",
      observations: "",
      conclusion: "",
      annualPlanId: "",
      departmentAuditId: "",
      activityId: "",
      evidenceIds: [],
    });
    setSelectedWP(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      Draft: "secondary",
      "Under Review": "outline",
      Approved: "default",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getLinkedEvidence = (evidenceIds: string[]) => {
    return evidence.filter((ev) => evidenceIds.includes(ev.id));
  };

  const getLinkedFindings = (findingIds: string[]) => {
    return findings.filter((f) => findingIds.includes(f.id));
  };

  const WorkingPaperForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="workingPaperId">
            Working Paper ID <span className="text-destructive">*</span>
          </Label>
          <Input
            id="workingPaperId"
            placeholder="WP-2025-001"
            value={formData.workingPaperId}
            onChange={(e) => setFormData({ ...formData, workingPaperId: e.target.value })}
            disabled={isEdit}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="auditArea">Audit Area</Label>
          <Input
            id="auditArea"
            placeholder="e.g., Benefits Processing"
            value={formData.auditArea}
            onChange={(e) => setFormData({ ...formData, auditArea: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Working Paper title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="objective">
          Objective <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="objective"
          placeholder="What is the objective of this working paper?"
          value={formData.objective}
          onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="procedure">Procedure / Test Performed</Label>
        <Textarea
          id="procedure"
          placeholder="Describe the audit procedure"
          value={formData.procedure}
          onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="testPerformed">Test Performed</Label>
        <Textarea
          id="testPerformed"
          placeholder="Detail the specific tests conducted"
          value={formData.testPerformed}
          onChange={(e) => setFormData({ ...formData, testPerformed: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>
          Link Evidence <span className="text-destructive">* (Required: At least 1)</span>
        </Label>
        <Select
          onValueChange={(value) => {
            if (!formData.evidenceIds.includes(value)) {
              setFormData({ ...formData, evidenceIds: [...formData.evidenceIds, value] });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select evidence to link" />
          </SelectTrigger>
          <SelectContent>
            {evidence.map((ev) => (
              <SelectItem key={ev.id} value={ev.id}>
                {ev.evidenceId} - {ev.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.evidenceIds.map((evId) => {
            const ev = evidence.find((e) => e.id === evId);
            return (
              <Badge key={evId} variant="secondary" className="flex items-center gap-1">
                {ev?.evidenceId}
                <button
                  onClick={() =>
                    setFormData({
                      ...formData,
                      evidenceIds: formData.evidenceIds.filter((id) => id !== evId),
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="results">Results</Label>
        <Textarea
          id="results"
          placeholder="Test results and data"
          value={formData.results}
          onChange={(e) => setFormData({ ...formData, results: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observations">Observations</Label>
        <Textarea
          id="observations"
          placeholder="Key observations from the audit work"
          value={formData.observations}
          onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="conclusion">Conclusion</Label>
        <Textarea
          id="conclusion"
          placeholder="Professional conclusion based on work performed"
          value={formData.conclusion}
          onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={() => (isEdit ? setIsEditOpen(false) : setIsCreateOpen(false))}>
          Cancel
        </Button>
        <Button onClick={isEdit ? handleUpdate : handleCreate}>
          {isEdit ? "Update" : "Create"} Working Paper
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
            <h1 className="text-3xl font-bold">Working Papers</h1>
            <p className="text-muted-foreground">
              Manage audit working papers with full Evidence → Working Papers → Findings traceability
            </p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Working Paper
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create New Working Paper</DialogTitle>
              <DialogDescription>
                Create a comprehensive working paper with linkages to evidence and findings. All changes are logged in the audit trail.
              </DialogDescription>
            </DialogHeader>
            <WorkingPaperForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Working Papers</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workingPapers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workingPapers.filter((wp) => wp.status === "Draft").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workingPapers.filter((wp) => wp.status === "Under Review").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workingPapers.filter((wp) => wp.status === "Approved").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Working Papers Repository</CardTitle>
          <CardDescription>Search and filter working papers with full traceability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search by Working Paper ID or Title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WP ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Evidence Links</TableHead>
                <TableHead>Finding Links</TableHead>
                <TableHead>Prepared By</TableHead>
                <TableHead>Reviewed By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWPs.map((wp) => (
                <TableRow key={wp.id}>
                  <TableCell className="font-medium">{wp.workingPaperId}</TableCell>
                  <TableCell>{wp.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{wp.evidenceIds.length} Evidence</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{wp.linkedFindingIds.length} Findings</Badge>
                  </TableCell>
                  <TableCell>{wp.preparedBy}</TableCell>
                  <TableCell>{wp.reviewedBy || "-"}</TableCell>
                  <TableCell>{getStatusBadge(wp.status)}</TableCell>
                  <TableCell>v{wp.version}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handlePreview(wp)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(wp)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Working Paper</DialogTitle>
            <DialogDescription>
              Update working paper details. All changes are logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <WorkingPaperForm isEdit />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Working Paper: {selectedWP?.workingPaperId}</DialogTitle>
            <DialogDescription>Complete working paper details with traceability links</DialogDescription>
          </DialogHeader>

          {selectedWP && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Title</Label>
                  <p className="font-medium">{selectedWP.title}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedWP.status)}</div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Objective</Label>
                <p className="mt-1">{selectedWP.objective}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Audit Area</Label>
                <p className="mt-1">{selectedWP.auditArea}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Procedure / Test Performed</Label>
                <p className="mt-1">{selectedWP.procedure}</p>
                <p className="mt-2">{selectedWP.testPerformed}</p>
              </div>

              <div>
                <Label className="text-muted-foreground flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Linked Evidence ({selectedWP.evidenceIds.length})
                </Label>
                <div className="mt-2 space-y-2">
                  {getLinkedEvidence(selectedWP.evidenceIds).map((ev) => (
                    <div key={ev.id} className="flex items-center gap-2 p-2 border rounded">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{ev.evidenceId}</p>
                        <p className="text-xs text-muted-foreground">{ev.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Results</Label>
                <p className="mt-1">{selectedWP.results}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Observations</Label>
                <p className="mt-1">{selectedWP.observations}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Conclusion</Label>
                <p className="mt-1">{selectedWP.conclusion}</p>
              </div>

              <div>
                <Label className="text-muted-foreground flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Linked Findings ({selectedWP.linkedFindingIds.length})
                </Label>
                <div className="mt-2 space-y-2">
                  {getLinkedFindings(selectedWP.linkedFindingIds).map((finding) => (
                    <div key={finding.id} className="flex items-center gap-2 p-2 border rounded">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{finding.findingId}</p>
                        <p className="text-xs text-muted-foreground">{finding.title}</p>
                      </div>
                      <Badge variant={finding.riskRating === "High" ? "destructive" : "secondary"}>
                        {finding.riskRating}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground">Prepared By</Label>
                  <p className="font-medium">{selectedWP.preparedBy}</p>
                  <p className="text-xs text-muted-foreground">{selectedWP.preparedDate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reviewed By</Label>
                  <p className="font-medium">{selectedWP.reviewedBy || "Pending"}</p>
                  <p className="text-xs text-muted-foreground">{selectedWP.reviewedDate || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Version</Label>
                  <p className="font-medium">v{selectedWP.version}</p>
                  <p className="text-xs text-muted-foreground">Last modified: {selectedWP.lastModifiedDate}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Audit Trail</Label>
                <div className="mt-2 space-y-2">
                  {selectedWP.auditTrail.map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-muted/50 rounded text-sm">
                      <Badge variant="outline">{entry.action}</Badge>
                      <div className="flex-1">
                        <p className="font-medium">{entry.performedBy}</p>
                        <p className="text-xs text-muted-foreground">{entry.performedDate}</p>
                        {entry.notes && <p className="text-xs mt-1">{entry.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => { setIsPreviewOpen(false); handleEdit(selectedWP); }}>
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

export default WorkingPapers;
