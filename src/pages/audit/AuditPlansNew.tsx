import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Eye, FileText, Calendar, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { departments } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { AnnualPlanForm } from '@/components/audit/AnnualPlanForm';
import { DepartmentAuditForm } from '@/components/audit/DepartmentAuditForm';
import { Link } from 'react-router-dom';

// Mock data - replace with actual data later
const annualPlans = [
  {
    id: '1',
    fiscalYear: '2025-2026',
    title: 'Annual Internal Audit Plan 2025-2026',
    objective: 'To provide independent assurance and insights on the effectiveness of governance, risk management, and control processes.',
    status: 'Approved',
    createdBy: 'director@ssb.kn',
    createdDate: '2025-01-05',
    approvedBy: 'director@ssb.kn',
    approvedDate: '2025-01-15',
    totalDepartmentAudits: 8
  }
];

const departmentAudits = [
  {
    id: '1',
    annualPlanId: '1',
    departmentId: 'dept-001',
    departmentName: 'Department of Benefits',
    period: 'Q1',
    monthYear: '2025-02',
    functions: ['Claims Processing', 'Payment Authorization'],
    riskRating: 'High',
    leadAuditor: 'auditor-001',
    leadAuditorName: 'Maria Rodriguez',
    status: 'In Progress',
    plannedStart: '2025-02-01',
    plannedEnd: '2025-02-28'
  },
  {
    id: '2',
    annualPlanId: '1',
    departmentId: 'dept-002',
    departmentName: 'Department of Contributions',
    period: 'Q1',
    monthYear: '2025-03',
    functions: ['Employer Compliance', 'Payment Processing'],
    riskRating: 'Medium',
    leadAuditor: 'auditor-002',
    leadAuditorName: 'James Thompson',
    status: 'Planned',
    plannedStart: '2025-03-01',
    plannedEnd: '2025-03-31'
  }
];

export default function AuditPlansNew() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [isAnnualPlanDialogOpen, setIsAnnualPlanDialogOpen] = useState(false);
  const [isDeptAuditDialogOpen, setIsDeptAuditDialogOpen] = useState(false);
  const [selectedAnnualPlan, setSelectedAnnualPlan] = useState<any>(null);
  const [viewAnnualPlan, setViewAnnualPlan] = useState<any>(null);
  const [editAnnualPlan, setEditAnnualPlan] = useState<any>(null);
  const [viewDeptAudit, setViewDeptAudit] = useState<any>(null);
  const [editDeptAudit, setEditDeptAudit] = useState<any>(null);

  const getStatusBadge = (status: string) => {
    const colors = {
      'Draft': 'bg-gray-500',
      'Submitted': 'bg-blue-500',
      'Approved': 'bg-green-500',
      'In Progress': 'bg-yellow-500',
      'Completed': 'bg-purple-500',
      'Cancelled': 'bg-red-500'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  const getRiskBadge = (risk: string) => {
    const colors = {
      'Low': 'bg-green-500',
      'Medium': 'bg-yellow-500',
      'High': 'bg-red-500'
    };
    return <Badge className={colors[risk as keyof typeof colors]}>{risk}</Badge>;
  };

  const filteredDeptAudits = departmentAudits.filter(audit => {
    const matchesSearch = audit.departmentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPeriod = selectedPeriod === 'all' || audit.period === selectedPeriod;
    return matchesSearch && matchesPeriod;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Internal Audit Plans</h1>
          <p className="text-muted-foreground">
            Manage annual and department-specific audit plans | 
            <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link> | 
            <Link to="/audit/calendar" className="text-blue-600 hover:underline ml-1">View Calendar</Link>
          </p>
        </div>
        {hasPermission('create_audit_plans') && (
          <Dialog open={isAnnualPlanDialogOpen} onOpenChange={setIsAnnualPlanDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Annual Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Annual Audit Plan</DialogTitle>
              </DialogHeader>
              <AnnualPlanForm onClose={() => setIsAnnualPlanDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Annual Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Annual Audit Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fiscal Year</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Department Audits</TableHead>
                <TableHead>Approved Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {annualPlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.fiscalYear}</TableCell>
                  <TableCell>{plan.title}</TableCell>
                  <TableCell>{getStatusBadge(plan.status)}</TableCell>
                  <TableCell>{plan.totalDepartmentAudits} planned</TableCell>
                  <TableCell>
                    {plan.approvedDate ? new Date(plan.approvedDate).toLocaleDateString() : 'Pending'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewAnnualPlan(plan)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditAnnualPlan(plan)}
                        disabled={plan.status === 'Approved'}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      {plan.status === 'Approved' && (
                        <Dialog open={isDeptAuditDialogOpen} onOpenChange={setIsDeptAuditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm"
                              onClick={() => setSelectedAnnualPlan(plan)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Dept Audit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Add Department Audit to {plan.fiscalYear}</DialogTitle>
                            </DialogHeader>
                            {selectedAnnualPlan && (
                              <DepartmentAuditForm 
                                annualPlanId={selectedAnnualPlan.id}
                                onClose={() => setIsDeptAuditDialogOpen(false)} 
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Department Audits */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Department Audit Plans</CardTitle>
            <div className="flex gap-4">
              <div className="relative w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Periods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  <SelectItem value="Q1">Quarter 1</SelectItem>
                  <SelectItem value="Q2">Quarter 2</SelectItem>
                  <SelectItem value="Q3">Quarter 3</SelectItem>
                  <SelectItem value="Q4">Quarter 4</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Functions</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Lead Auditor</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeptAudits.map((audit) => (
                <TableRow key={audit.id}>
                  <TableCell className="font-medium">{audit.departmentName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {audit.period} - {new Date(audit.monthYear).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {audit.functions.slice(0, 2).map(func => (
                        <Badge key={func} variant="outline" className="text-xs">
                          {func}
                        </Badge>
                      ))}
                      {audit.functions.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{audit.functions.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getRiskBadge(audit.riskRating)}</TableCell>
                  <TableCell>{audit.leadAuditorName}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(audit.plannedStart!).toLocaleDateString()} - {new Date(audit.plannedEnd!).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(audit.status)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewDeptAudit(audit)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditDeptAudit(audit)}
                        disabled={audit.status === 'Completed'}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Link to="/audit/calendar">
                        <Button variant="outline" size="sm">
                          <Calendar className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Annual Plan Dialog */}
      <Dialog open={!!viewAnnualPlan} onOpenChange={() => setViewAnnualPlan(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Annual Audit Plan Details</DialogTitle>
          </DialogHeader>
          {viewAnnualPlan && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Plan Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Fiscal Year</p>
                      <p className="text-lg font-semibold">{viewAnnualPlan.fiscalYear}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <div className="mt-1">{getStatusBadge(viewAnnualPlan.status)}</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Title</p>
                    <p className="mt-1">{viewAnnualPlan.title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Objective</p>
                    <p className="mt-1">{viewAnnualPlan.objective}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Created By</p>
                      <p className="mt-1">{viewAnnualPlan.createdBy}</p>
                      <p className="text-sm text-muted-foreground">{new Date(viewAnnualPlan.createdDate).toLocaleDateString()}</p>
                    </div>
                    {viewAnnualPlan.approvedBy && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Approved By</p>
                        <p className="mt-1">{viewAnnualPlan.approvedBy}</p>
                        <p className="text-sm text-muted-foreground">{new Date(viewAnnualPlan.approvedDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                  {viewAnnualPlan.status === 'Approved' && (
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        ℹ️ This is the approved annual plan for {viewAnnualPlan.fiscalYear}. Only one plan can be approved at a time.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Department Audits Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Department Audit Plans ({viewAnnualPlan.totalDepartmentAudits})</CardTitle>
                    <Link to="/audit/workload-capacity">
                      <Button variant="outline" size="sm">
                        <Users className="w-4 h-4 mr-2" />
                        View Workload Capacity
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {departmentAudits.filter(da => da.annualPlanId === viewAnnualPlan.id).length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No department audits added to this plan yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {departmentAudits
                        .filter(da => da.annualPlanId === viewAnnualPlan.id)
                        .map((deptAudit) => (
                          <Card key={deptAudit.id} className="border-2">
                            <CardContent className="pt-6">
                              <div className="space-y-4">
                                {/* Header Row */}
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="text-lg font-semibold">{deptAudit.departmentName}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline">
                                        {deptAudit.period} - {new Date(deptAudit.monthYear).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                      </Badge>
                                      {getRiskBadge(deptAudit.riskRating)}
                                      {getStatusBadge(deptAudit.status)}
                                    </div>
                                  </div>
                                </div>

                                {/* Functions */}
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-2">Functions to Audit</p>
                                  <div className="flex flex-wrap gap-2">
                                    {deptAudit.functions.map((func) => (
                                      <Badge key={func} variant="outline">{func}</Badge>
                                    ))}
                                  </div>
                                </div>

                                {/* Team & Schedule */}
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Lead Auditor</p>
                                    <p className="mt-1 font-medium">{deptAudit.leadAuditorName}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Schedule</p>
                                    <p className="mt-1 text-sm">
                                      {new Date(deptAudit.plannedStart!).toLocaleDateString()} - {new Date(deptAudit.plannedEnd!).toLocaleDateString()}
                                      <span className="text-muted-foreground ml-2">
                                        ({Math.ceil((new Date(deptAudit.plannedEnd!).getTime() - new Date(deptAudit.plannedStart!).getTime()) / (1000 * 60 * 60 * 24))} days)
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                {/* Resource Allocation */}
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-sm font-medium mb-2">Resource Allocation</p>
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Estimated Hours</p>
                                      <p className="font-semibold">40-60 hrs</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Team Size</p>
                                      <p className="font-semibold">2-3 auditors</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Priority</p>
                                      <p className="font-semibold">{deptAudit.riskRating === 'High' ? 'High' : deptAudit.riskRating === 'Medium' ? 'Medium' : 'Normal'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Audit Timeline Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => {
                      const quarterAudits = departmentAudits.filter(
                        da => da.annualPlanId === viewAnnualPlan.id && da.period === quarter
                      );
                      return (
                        <div key={quarter} className="flex items-center gap-4">
                          <div className="min-w-[80px]">
                            <Badge variant="outline" className="font-semibold">{quarter}</Badge>
                          </div>
                          <div className="flex-1">
                            {quarterAudits.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No audits scheduled</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {quarterAudits.map(audit => (
                                  <Badge key={audit.id} variant="secondary">
                                    {audit.departmentName}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {quarterAudits.length} audit{quarterAudits.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Annual Plan Dialog */}
      <Dialog open={!!editAnnualPlan} onOpenChange={() => setEditAnnualPlan(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Annual Audit Plan</DialogTitle>
          </DialogHeader>
          {editAnnualPlan && (
            <AnnualPlanForm 
              plan={editAnnualPlan}
              onClose={() => setEditAnnualPlan(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Department Audit Dialog */}
      <Dialog open={!!viewDeptAudit} onOpenChange={() => setViewDeptAudit(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Department Audit Details</DialogTitle>
          </DialogHeader>
          {viewDeptAudit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="text-lg font-semibold">{viewDeptAudit.departmentName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(viewDeptAudit.status)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Period</p>
                  <Badge variant="outline">{viewDeptAudit.period}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Risk Rating</p>
                  <div className="mt-1">{getRiskBadge(viewDeptAudit.riskRating)}</div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Functions to Audit</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {viewDeptAudit.functions.map((func: string) => (
                    <Badge key={func} variant="outline">{func}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lead Auditor</p>
                <p className="mt-1">{viewDeptAudit.leadAuditorName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Planned Start</p>
                  <p className="mt-1">{new Date(viewDeptAudit.plannedStart).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Planned End</p>
                  <p className="mt-1">{new Date(viewDeptAudit.plannedEnd).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Department Audit Dialog */}
      <Dialog open={!!editDeptAudit} onOpenChange={() => setEditDeptAudit(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Department Audit</DialogTitle>
          </DialogHeader>
          {editDeptAudit && (
            <DepartmentAuditForm 
              annualPlanId={editDeptAudit.annualPlanId}
              departmentAudit={editDeptAudit}
              onClose={() => setEditDeptAudit(null)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
