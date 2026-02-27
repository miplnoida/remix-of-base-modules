import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye, Edit, Send, FileText, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIAAnnualPlans, useIAAnnualPlanMutations, useIADepartments } from '@/hooks/useAuditData';
import { useToast } from '@/hooks/use-toast';
import { AnnualPlanForm } from '@/components/audit/AnnualPlanForm';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

export default function AuditPlans() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: plans = [], isLoading } = useIAAnnualPlans();
  const { data: departments = [] } = useIADepartments();
  const { update } = useIAAnnualPlanMutations();

  const filteredPlans = plans.filter((plan: any) => {
    const matchesSearch = (plan.fiscal_year || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (plan.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || plan.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = { 'Draft': 'bg-gray-500', 'Submitted': 'bg-blue-500', 'Approved': 'bg-green-500', 'In Progress': 'bg-orange-600', 'Completed': 'bg-purple-500', 'Rejected': 'bg-red-500', 'Cancelled': 'bg-gray-400' };
    return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>;
  };

  const handleSubmitPlan = (planId: string) => {
    update.mutate({ id: planId, status: 'Submitted', submitted_date: new Date().toISOString() });
  };

  const handleEditPlan = (plan: any) => {
    if (plan.status !== 'Draft') {
      toast({ title: "Cannot Edit", description: "Only draft plans can be edited.", variant: "destructive" });
      return;
    }
    setSelectedPlan(plan);
    setIsEditDialogOpen(true);
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Plans</h1>
          <p className="text-muted-foreground">
            Create and manage audit plans |
            <Link to="/" className="text-blue-600 hover:underline ml-1">← Back to Dashboard</Link> |
            <Link to="/audit/calendar" className="text-blue-600 hover:underline ml-1">View Calendar</Link>
          </p>
        </div>
        {hasPermission('create_audit_plans') && (
          <Button onClick={() => setIsCreateDialogOpen(!isCreateDialogOpen)}>
            <Plus className="w-4 h-4 mr-2" />Create Plan
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by period or title..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Plans Table */}
      <Card>
        <CardHeader><CardTitle>Audit Plans</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fiscal Year</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Objective</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.map((plan: any) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.fiscal_year}</TableCell>
                  <TableCell>{plan.title}</TableCell>
                  <TableCell>{getStatusBadge(plan.status)}</TableCell>
                  <TableCell className="max-w-xs truncate">{plan.objective}</TableCell>
                  <TableCell>{plan.created_at ? new Date(plan.created_at).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm"><Eye className="w-4 h-4" /></Button>
                      {hasPermission('edit_audit_plans') && plan.status === 'Draft' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="outline" size="sm" onClick={() => handleSubmitPlan(plan.id)}><Send className="w-4 h-4" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Form */}
      {isCreateDialogOpen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Create New Audit Plan</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsCreateDialogOpen(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent><AnnualPlanForm onClose={() => setIsCreateDialogOpen(false)} /></CardContent>
        </Card>
      )}

      {isEditDialogOpen && selectedPlan && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Edit Audit Plan</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent><AnnualPlanForm plan={selectedPlan} onClose={() => setIsEditDialogOpen(false)} /></CardContent>
        </Card>
      )}
    </div>
  );
}
