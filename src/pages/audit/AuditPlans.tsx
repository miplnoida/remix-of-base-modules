import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye, Edit, Send, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auditPlans, departments } from '@/data/auditData';
import { useToast } from '@/hooks/use-toast';
import { AuditPlanForm } from '@/components/audit/AuditPlanForm';
import { Link } from 'react-router-dom';

export default function AuditPlans() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const filteredPlans = auditPlans.filter(plan => {
    const matchesSearch = plan.monthYear.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.departments?.some((deptId: string) => 
                           departments.find(d => d.id === deptId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    const matchesDepartment = selectedDepartment === 'all' || plan.departments?.includes(selectedDepartment);
    const matchesStatus = selectedStatus === 'all' || plan.status === selectedStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      'Draft': 'bg-gray-500',
      'Submitted': 'bg-blue-500',
      'Approved': 'bg-green-500',
      'In Progress': 'bg-yellow-500',
      'Completed': 'bg-purple-500',
      'Rejected': 'bg-red-500',
      'Cancelled': 'bg-gray-400'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>{status}</Badge>;
  };

  const handleSubmitPlan = (planId: string) => {
    toast({
      title: "Plan Submitted",
      description: "Audit plan has been submitted for approval."
    });
  };

  const handleViewPlan = (plan: any) => {
    setSelectedPlan(plan);
    // Navigate to plan details view
  };

  const handleEditPlan = (plan: any) => {
    if (plan.status !== 'Draft') {
      toast({
        title: "Cannot Edit",
        description: "Only draft plans can be edited.",
        variant: "destructive"
      });
      return;
    }
    setSelectedPlan(plan);
    setIsEditDialogOpen(true);
  };

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
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Audit Plan</DialogTitle>
              </DialogHeader>
              <AuditPlanForm onClose={() => setIsCreateDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by period or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Departments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Objective</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.monthYear}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {plan.departments?.map((deptId: string) => {
                        const dept = departments.find(d => d.id === deptId);
                        return dept ? (
                          <Badge key={deptId} variant="outline" className="text-xs">
                            {dept.name.replace('Department of ', '')}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(plan.status)}</TableCell>
                  <TableCell className="max-w-xs truncate">{plan.objective}</TableCell>
                  <TableCell>{new Date(plan.createdDate).toLocaleDateString()}</TableCell>
                  <TableCell>{plan.createdBy}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewPlan(plan)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {hasPermission('edit_audit_plans') && plan.status === 'Draft' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditPlan(plan)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {hasPermission('edit_audit_plans') && plan.status === 'Draft' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSubmitPlan(plan.id)}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toast({ title: "Report Generated", description: "Plan report downloaded successfully." })}
                      >
                        <FileText className="w-4 h-4" />
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
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Audit Plan</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <AuditPlanForm 
              plan={selectedPlan} 
              onClose={() => setIsEditDialogOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}