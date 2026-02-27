import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye, FileText, Calendar, Mail, Send, Bell, FileEdit, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AnnualPlanForm } from '@/components/audit/AnnualPlanForm';
import { DepartmentAuditForm } from '@/components/audit/DepartmentAuditForm';
import { Link } from 'react-router-dom';
import { useIAAnnualPlans } from '@/hooks/useAuditData';
import { useIADepartmentAudits } from '@/hooks/useAuditData';

export default function AuditPlansNew() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [isAnnualPlanDialogOpen, setIsAnnualPlanDialogOpen] = useState(false);
  const [isDeptAuditDialogOpen, setIsDeptAuditDialogOpen] = useState(false);
  const [selectedAnnualPlan, setSelectedAnnualPlan] = useState<any>(null);
  const [viewAnnualPlan, setViewAnnualPlan] = useState<any>(null);
  const [editAnnualPlan, setEditAnnualPlan] = useState<any>(null);
  const [viewDeptAudit, setViewDeptAudit] = useState<any>(null);
  const [editDeptAudit, setEditDeptAudit] = useState<any>(null);

  const { data: annualPlans = [], isLoading: plansLoading } = useIAAnnualPlans();
  const { data: departmentAudits = [], isLoading: auditsLoading } = useIADepartmentAudits();

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Draft': 'bg-gray-500',
      'Submitted': 'bg-blue-500',
      'Approved': 'bg-green-500',
      'In Progress': 'bg-orange-600',
      'Completed': 'bg-purple-500',
      'Cancelled': 'bg-red-500'
    };
    return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  const getRiskBadge = (risk: string) => {
    const colors: Record<string, string> = { 'Low': 'bg-green-500', 'Medium': 'bg-orange-600', 'High': 'bg-red-500' };
    return <Badge className={colors[risk]}>{risk}</Badge>;
  };

  const filteredDeptAudits = departmentAudits.filter((audit: any) => {
    const name = audit.department_name || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPeriod = selectedPeriod === 'all' || audit.period === selectedPeriod;
    return matchesSearch && matchesPeriod;
  });

  if (plansLoading || auditsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          isMobile ? (
            <Dialog open={isAnnualPlanDialogOpen} onOpenChange={setIsAnnualPlanDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Create Annual Plan</Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Annual Audit Plan</DialogTitle></DialogHeader>
                <AnnualPlanForm onClose={() => setIsAnnualPlanDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          ) : (
            <Button onClick={() => setIsAnnualPlanDialogOpen(!isAnnualPlanDialogOpen)}>
              <Plus className="w-4 h-4 mr-2" />Create Annual Plan
            </Button>
          )
        )}
      </div>

      {/* Annual Plans */}
      <Card>
        <CardHeader><CardTitle>Annual Audit Plans</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fiscal Year</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approved Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {annualPlans.map((plan: any) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.fiscal_year}</TableCell>
                  <TableCell>{plan.title}</TableCell>
                  <TableCell>{getStatusBadge(plan.status)}</TableCell>
                  <TableCell>
                    {plan.approved_date ? new Date(plan.approved_date).toLocaleDateString() : 'Pending'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setViewAnnualPlan(plan)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditAnnualPlan(plan)} disabled={plan.status === 'Approved'}>
                        <FileText className="w-4 h-4" />
                      </Button>
                      {plan.status === 'Approved' && (
                        <Button size="sm" onClick={() => { setSelectedAnnualPlan(plan); setIsDeptAuditDialogOpen(true); }}>
                          <Plus className="w-4 h-4 mr-1" />Add Dept Audit
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {annualPlans.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No annual plans found</TableCell></TableRow>
              )}
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
                <Input placeholder="Search by department..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Periods" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  <SelectItem value="Q1">Quarter 1</SelectItem>
                  <SelectItem value="Q2">Quarter 2</SelectItem>
                  <SelectItem value="Q3">Quarter 3</SelectItem>
                  <SelectItem value="Q4">Quarter 4</SelectItem>
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
                <TableHead>Risk</TableHead>
                <TableHead>Lead Auditor</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeptAudits.map((audit: any) => (
                <TableRow key={audit.id}>
                  <TableCell className="font-medium">{audit.department_name || 'N/A'}</TableCell>
                  <TableCell><Badge variant="outline">{audit.period || 'N/A'}</Badge></TableCell>
                  <TableCell>{getRiskBadge(audit.risk_rating || 'Medium')}</TableCell>
                  <TableCell>{audit.lead_auditor_name || 'Unassigned'}</TableCell>
                  <TableCell className="text-sm">
                    {audit.planned_start ? new Date(audit.planned_start).toLocaleDateString() : 'TBD'} - {audit.planned_end ? new Date(audit.planned_end).toLocaleDateString() : 'TBD'}
                  </TableCell>
                  <TableCell>{getStatusBadge(audit.status || 'Draft')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setViewDeptAudit(audit)}><Eye className="w-4 h-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => setEditDeptAudit(audit)} disabled={audit.status === 'Completed'}><FileEdit className="w-4 h-4" /></Button>
                      <Button variant="outline" size="sm" title="Generate Communications" onClick={() => toast({ title: "Communications", description: "Use the Communication Center module for this department audit." })}>
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDeptAudits.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No department audits found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Annual Plan Dialog */}
      {viewAnnualPlan && (
        <Dialog open={!!viewAnnualPlan} onOpenChange={() => setViewAnnualPlan(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Annual Plan Details</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><strong>Fiscal Year:</strong> {viewAnnualPlan.fiscal_year}</div>
              <div><strong>Title:</strong> {viewAnnualPlan.title}</div>
              <div><strong>Status:</strong> {viewAnnualPlan.status}</div>
              <div><strong>Objective:</strong> {viewAnnualPlan.objective || 'N/A'}</div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View Dept Audit Dialog */}
      {viewDeptAudit && (
        <Dialog open={!!viewDeptAudit} onOpenChange={() => setViewDeptAudit(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Department Audit Details</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><strong>Department:</strong> {viewDeptAudit.department_name}</div>
              <div><strong>Period:</strong> {viewDeptAudit.period}</div>
              <div><strong>Status:</strong> {viewDeptAudit.status}</div>
              <div><strong>Risk Rating:</strong> {viewDeptAudit.risk_rating}</div>
              <div><strong>Lead Auditor:</strong> {viewDeptAudit.lead_auditor_name || 'Unassigned'}</div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Dept Audit Dialog */}
      {isDeptAuditDialogOpen && selectedAnnualPlan && (
        <Dialog open={isDeptAuditDialogOpen} onOpenChange={setIsDeptAuditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Department Audit to {selectedAnnualPlan.fiscal_year}</DialogTitle></DialogHeader>
            <DepartmentAuditForm annualPlanId={selectedAnnualPlan.id} onClose={() => setIsDeptAuditDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      )}

      {/* Create Annual Plan Dialog (non-mobile) */}
      {!isMobile && isAnnualPlanDialogOpen && (
        <Dialog open={isAnnualPlanDialogOpen} onOpenChange={setIsAnnualPlanDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Annual Audit Plan</DialogTitle></DialogHeader>
            <AnnualPlanForm onClose={() => setIsAnnualPlanDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
