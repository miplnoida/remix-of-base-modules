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
import { Plus, Search, AlertTriangle, Eye, Edit, ChevronDown, ChevronRight } from 'lucide-react';
import { findings, auditPlans, auditActivities, recommendations } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function FindingsManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [expandedFindings, setExpandedFindings] = useState<string[]>([]);

  const filteredFindings = findings.filter(finding => {
    const matchesSearch = finding.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         finding.findingId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'all' || finding.riskRating === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const getRiskBadge = (risk: string) => {
    const colors = {
      'High': 'bg-red-500',
      'Medium': 'bg-orange-600',
      'Low': 'bg-green-500'
    };
    return <Badge className={colors[risk as keyof typeof colors] || 'bg-gray-500'}>{risk}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'Draft': 'bg-gray-500',
      'For Mgmt Response': 'bg-blue-500',
      'Under Review': 'bg-orange-600',
      'Agreed': 'bg-green-500',
      'Not Agreed': 'bg-red-500',
      'Finalized': 'bg-purple-500'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Findings & Recommendations</h1>
          <p className="text-muted-foreground">
            Document audit findings using the 5C methodology |
            <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link>
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Finding
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Document New Finding</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Finding ID</Label>
                  <Input placeholder="F-2025-001" />
                </div>
                <div>
                  <Label>Department</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dept-001">Department of Benefits</SelectItem>
                      <SelectItem value="dept-002">Department of Contributions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department Audit</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dept audit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="audit-1">Benefits Q1 2025</SelectItem>
                      <SelectItem value="audit-2">Contributions Q1 2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Activity</Label>
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
              </div>

              <div>
                <Label>Finding Title</Label>
                <Input placeholder="Brief description of the finding" />
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">5C Methodology</h3>
                
                <div>
                  <Label>Condition (What is wrong?)</Label>
                  <Textarea placeholder="Describe the current situation..." rows={2} />
                </div>

                <div>
                  <Label>Criteria (What should it be?)</Label>
                  <Textarea placeholder="State the standard, policy, or regulation..." rows={2} />
                </div>

                <div>
                  <Label>Cause (Why did it happen?)</Label>
                  <Textarea placeholder="Explain the root cause..." rows={2} />
                </div>

                <div>
                  <Label>Effect (What is the impact?)</Label>
                  <Textarea placeholder="Describe the consequences..." rows={2} />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Recommendations</h3>
                <p className="text-sm text-muted-foreground">Add one or more recommendations for this finding</p>
                
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Recommendation 1</Label>
                      <Textarea placeholder="Suggest corrective action..." rows={2} />
                    </div>
                    <div className="w-32">
                      <Label>Priority</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Recommendation
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Risk Rating</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Impact Area</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Financial">Financial</SelectItem>
                      <SelectItem value="Compliance">Compliance</SelectItem>
                      <SelectItem value="Operational">Operational</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Owner Role</Label>
                <Input placeholder="e.g., Department Head, Manager" />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Save as Draft</Button>
                <Button onClick={() => toast({ 
                  title: "Finding Saved", 
                  description: "Finding has been documented and is ready for management response" 
                })}>
                  Submit for Response
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
            <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{findings.length}</div>
            <p className="text-xs text-muted-foreground">All findings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {findings.filter(f => f.riskRating === 'High').length}
            </div>
            <p className="text-xs text-muted-foreground">Critical findings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Response</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {findings.filter(f => f.status === 'For Mgmt Response').length}
            </div>
            <p className="text-xs text-muted-foreground">Pending action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalized</CardTitle>
            <AlertTriangle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {findings.filter(f => f.status === 'Finalized').length}
            </div>
            <p className="text-xs text-muted-foreground">Closed findings</p>
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
                  placeholder="Search by finding ID or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="High">High Risk</SelectItem>
                <SelectItem value="Medium">Medium Risk</SelectItem>
                <SelectItem value="Low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Findings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Findings ({filteredFindings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Finding ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Impact Area</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFindings.map((finding) => {
                const findingRecs = recommendations.filter(r => r.findingId === finding.id);
                const isExpanded = expandedFindings.includes(finding.id);
                
                return (
                  <React.Fragment key={finding.id}>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setExpandedFindings(prev => 
                                isExpanded ? prev.filter(id => id !== finding.id) : [...prev, finding.id]
                              );
                            }}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                          {finding.findingId}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">{finding.title}</TableCell>
                      <TableCell>{getRiskBadge(finding.riskRating)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{finding.impactArea}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{finding.ownerRole}</TableCell>
                      <TableCell>{getStatusBadge(finding.status)}</TableCell>
                      <TableCell>{new Date(finding.createdDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && findingRecs.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/50">
                          <div className="py-4 px-8">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              Recommendations ({findingRecs.length})
                            </h4>
                            <div className="space-y-3">
                              {findingRecs.map((rec, idx) => (
                                <div key={rec.id} className="border-l-2 border-primary pl-4">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-sm">Recommendation #{idx + 1}</span>
                                    <Badge variant="outline" className={
                                      rec.priority === 'High' ? 'border-red-500 text-red-500' :
                                      rec.priority === 'Medium' ? 'border-orange-500 text-orange-500' :
                                      'border-green-500 text-green-500'
                                    }>
                                      {rec.priority} Priority
                                    </Badge>
                                  </div>
                                  <p className="text-sm">{rec.recommendationText}</p>
                                  {rec.responsibleParty && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Responsible: {rec.responsibleParty} | Target: {new Date(rec.targetDate).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
