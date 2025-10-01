import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FileText, Eye, Edit, Link as LinkIcon } from 'lucide-react';
import { workingPapers, findings, evidence } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function WorkingPapers() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedWP, setSelectedWP] = useState<any>(null);

  const filteredWPs = workingPapers.filter(wp => {
    const matchesSearch = wp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         wp.workingPaperId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || wp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      'Draft': 'bg-gray-500',
      'Under Review': 'bg-orange-600',
      'Approved': 'bg-green-500'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Working Papers</h1>
          <p className="text-muted-foreground">
            Manage audit working papers and link with evidence and findings |
            <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link> |
            <Link to="/audit/evidence" className="text-blue-600 hover:underline ml-1">Evidence</Link> |
            <Link to="/audit/findings" className="text-blue-600 hover:underline ml-1">Findings</Link>
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Working Paper
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Working Paper</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Working Paper ID</Label>
                  <Input placeholder="WP-2025-001" />
                </div>
                <div>
                  <Label>Activity</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="act-001">Caribbean Bank - Site Visit</SelectItem>
                      <SelectItem value="act-002">Island Resort - Records Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Title</Label>
                <Input placeholder="Working paper title" />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea placeholder="Brief description of the working paper" rows={2} />
              </div>

              <div>
                <Label>Content</Label>
                <Textarea placeholder="Detailed working paper content, analysis, and conclusions" rows={6} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Link to Finding (Optional)</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select finding" />
                    </SelectTrigger>
                    <SelectContent>
                      {findings.map(finding => (
                        <SelectItem key={finding.id} value={finding.id}>
                          {finding.findingId} - {finding.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Link to Evidence (Optional)</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select evidence" />
                    </SelectTrigger>
                    <SelectContent>
                      {evidence.map(ev => (
                        <SelectItem key={ev.id} value={ev.id}>
                          {ev.evidenceId} - {ev.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Tags (comma separated)</Label>
                <Input placeholder="compliance, payroll, calculations" />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Save as Draft</Button>
                <Button onClick={() => toast({ 
                  title: "Working Paper Created", 
                  description: "Working paper has been created successfully" 
                })}>
                  Submit for Review
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
            <CardTitle className="text-sm font-medium">Total Working Papers</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workingPapers.length}</div>
            <p className="text-xs text-muted-foreground">All papers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <FileText className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workingPapers.filter(wp => wp.status === 'Draft').length}
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <FileText className="h-4 w-4 text-orange-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workingPapers.filter(wp => wp.status === 'Under Review').length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workingPapers.filter(wp => wp.status === 'Approved').length}
            </div>
            <p className="text-xs text-muted-foreground">Finalized</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Working Papers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Working Papers ({filteredWPs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WP ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Linked Items</TableHead>
                <TableHead>Prepared By</TableHead>
                <TableHead>Reviewed By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWPs.map((wp) => (
                <TableRow key={wp.id}>
                  <TableCell className="font-medium">{wp.workingPaperId}</TableCell>
                  <TableCell className="max-w-md">{wp.title}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      {wp.findingId && (
                        <div className="flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" />
                          Finding: {findings.find(f => f.id === wp.findingId)?.findingId}
                        </div>
                      )}
                      {wp.evidenceIds?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" />
                          Evidence: {wp.evidenceIds.length} item(s)
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{wp.preparedBy}</TableCell>
                  <TableCell className="text-sm">{wp.reviewedBy || 'Pending'}</TableCell>
                  <TableCell>{getStatusBadge(wp.status)}</TableCell>
                  <TableCell>{new Date(wp.createdDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedWP(wp)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{wp.workingPaperId} - {wp.title}</DialogTitle>
                          </DialogHeader>
                          {selectedWP && (
                            <div className="space-y-4">
                              <div>
                                <Label>Description</Label>
                                <p className="text-sm mt-1">{selectedWP.description}</p>
                              </div>
                              <div>
                                <Label>Content</Label>
                                <p className="text-sm mt-1 whitespace-pre-line">{selectedWP.content}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Prepared By</Label>
                                  <p className="text-sm mt-1">{selectedWP.preparedBy}</p>
                                </div>
                                <div>
                                  <Label>Reviewed By</Label>
                                  <p className="text-sm mt-1">{selectedWP.reviewedBy || 'Not yet reviewed'}</p>
                                </div>
                              </div>
                              <div>
                                <Label>Status</Label>
                                <div className="mt-1">{getStatusBadge(selectedWP.status)}</div>
                              </div>
                              {selectedWP.tags && (
                                <div>
                                  <Label>Tags</Label>
                                  <div className="flex gap-2 mt-1">
                                    {selectedWP.tags.map((tag: string) => (
                                      <Badge key={tag} variant="outline">{tag}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
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
}
