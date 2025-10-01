import { useState } from "react";
import { ArrowLeft, Plus, Eye, Download, FileText, Link as LinkIcon } from "lucide-react";
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
import { evidence, workingPapers } from "@/data/auditData";

export default function EvidenceManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvidence = evidence.filter(ev =>
    ev.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ev.evidenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ev.referenceNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Evidence Management</h1>
          <p className="text-muted-foreground">
            Upload and manage audit evidence and documentation |
            <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link>
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Evidence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Audit Evidence</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Department Audit</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department audit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dept-audit-1">Benefits - Q1 2025 Audit</SelectItem>
                    <SelectItem value="dept-audit-2">Contributions - Q1 2025 Audit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Related Activity</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {auditActivities.map(activity => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Evidence ID</Label>
                <Input placeholder="EV-2025-001" />
              </div>
              <div>
                <Label>Reference Number</Label>
                <Input placeholder="WP-001-01" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  placeholder="Describe the evidence being uploaded..."
                  rows={3}
                />
              </div>
              <div>
                <Label>File</Label>
                <Input type="file" multiple />
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: PDF, Excel, Word, Images
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button onClick={() => toast({ 
                  title: "Evidence Uploaded", 
                  description: "Evidence has been uploaded and hashed for integrity" 
                })}>
                  Upload Evidence
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Evidence</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{evidence.length}</div>
            <p className="text-xs text-muted-foreground">Files uploaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {evidence.filter(ev => {
                const uploadDate = new Date(ev.uploadDate);
                const now = new Date();
                return uploadDate.getMonth() === now.getMonth() && 
                       uploadDate.getFullYear() === now.getFullYear();
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Recent uploads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activities</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(evidence.map(ev => ev.activityId).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground">With evidence</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Findings</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {evidence.filter(ev => ev.findingId).length}
            </div>
            <p className="text-xs text-muted-foreground">Linked evidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by evidence ID, reference number, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Evidence Table */}
      <Card>
        <CardHeader>
          <CardTitle>Evidence Repository ({filteredEvidence.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
              <TableHead>Evidence ID</TableHead>
              <TableHead>Reference No.</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Working Papers</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {filteredEvidence.map((ev) => {
              const linkedWPs = workingPapers.filter((wp) => wp.evidenceIds.includes(ev.id));
              return (
                <TableRow key={ev.id}>
                  <TableCell className="font-medium">{ev.evidenceId}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ev.referenceNo}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {ev.description}
                  </TableCell>
                  <TableCell>
                    {linkedWPs.length > 0 ? (
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <LinkIcon className="h-3 w-3" />
                        {linkedWPs.length} WP{linkedWPs.length !== 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{ev.file}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(ev.uploadDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{ev.uploadedBy.split('@')[0]}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
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
}
