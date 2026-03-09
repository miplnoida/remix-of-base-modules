import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, CheckCircle, Clock, XCircle, Eye, Plus, Trash2 } from 'lucide-react';
import { MOCK_WEEKLY_PLANS, MOCK_INSPECTORS } from '@/services/mockData/complianceData';
import { WeeklyPlanStatus } from '@/types/compliance';
import { useToast } from '@/hooks/use-toast';

interface PlannedVisit {
  id: string;
  employerName: string;
  visitType: string;
  scheduledDate: string;
  purpose: string;
}

export default function InspectorPlans() {
  const { toast } = useToast();
  const [selectedInspector, setSelectedInspector] = useState<string>('ALL');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  
  const [newPlan, setNewPlan] = useState({
    inspectorId: '',
    weekStartDate: '',
    weekEndDate: '',
    visits: [] as PlannedVisit[],
  });

  const [newVisit, setNewVisit] = useState({
    employerName: '',
    visitType: 'C3_FOLLOW_UP',
    scheduledDate: '',
    purpose: '',
  });

  const filteredPlans = selectedInspector === 'ALL' 
    ? MOCK_WEEKLY_PLANS 
    : MOCK_WEEKLY_PLANS.filter(p => p.inspectorId === selectedInspector);

  const getStatusColor = (status: WeeklyPlanStatus) => {
    const colors: Record<WeeklyPlanStatus, string> = {
      [WeeklyPlanStatus.PLAN_DRAFT]: 'bg-gray-100 text-gray-800',
      [WeeklyPlanStatus.PLAN_SUBMITTED]: 'bg-blue-100 text-blue-800',
      [WeeklyPlanStatus.PLAN_TBS]: 'bg-yellow-100 text-yellow-800',
      [WeeklyPlanStatus.PLAN_APPROVED]: 'bg-green-100 text-green-800',
    };
    return colors[status];
  };

  const getStatusIcon = (status: WeeklyPlanStatus) => {
    const icons: Record<WeeklyPlanStatus, JSX.Element> = {
      [WeeklyPlanStatus.PLAN_DRAFT]: <Clock className="h-4 w-4" />,
      [WeeklyPlanStatus.PLAN_SUBMITTED]: <Clock className="h-4 w-4" />,
      [WeeklyPlanStatus.PLAN_TBS]: <XCircle className="h-4 w-4" />,
      [WeeklyPlanStatus.PLAN_APPROVED]: <CheckCircle className="h-4 w-4" />,
    };
    return icons[status];
  };

  const handleAddVisit = () => {
    if (!newVisit.employerName || !newVisit.scheduledDate || !newVisit.purpose) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all visit details',
        variant: 'destructive',
      });
      return;
    }

    const visit: PlannedVisit = {
      id: Math.random().toString(36).substr(2, 9),
      ...newVisit,
    };

    setNewPlan(prev => ({
      ...prev,
      visits: [...prev.visits, visit],
    }));

    setNewVisit({
      employerName: '',
      visitType: 'C3_FOLLOW_UP',
      scheduledDate: '',
      purpose: '',
    });

    toast({
      title: 'Visit Added',
      description: 'Visit has been added to the plan',
    });
  };

  const handleRemoveVisit = (visitId: string) => {
    setNewPlan(prev => ({
      ...prev,
      visits: prev.visits.filter(v => v.id !== visitId),
    }));
  };

  const handleCreatePlan = () => {
    if (!newPlan.inspectorId || !newPlan.weekStartDate || !newPlan.weekEndDate) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (newPlan.visits.length === 0) {
      toast({
        title: 'No Visits',
        description: 'Please add at least one planned visit',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Plan Created',
      description: 'Weekly plan has been created successfully',
    });

    setCreateDialogOpen(false);
    setNewPlan({
      inspectorId: '',
      weekStartDate: '',
      weekEndDate: '',
      visits: [],
    });
  };

  const handleViewPlan = (plan: any) => {
    setSelectedPlan(plan);
    setViewDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Inspector Weekly Plans"
        subtitle="Manage weekly workplans, approvals, and scheduling"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Inspector Plans' }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Inspectors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{MOCK_INSPECTORS.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plans This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {MOCK_WEEKLY_PLANS.filter(p => p.status === WeeklyPlanStatus.PLAN_APPROVED).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {MOCK_WEEKLY_PLANS.filter(p => p.status === WeeklyPlanStatus.PLAN_SUBMITTED).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {MOCK_WEEKLY_PLANS.reduce((sum, p) => sum + p.completedVisits, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <Label htmlFor="inspector-filter">Filter by Inspector:</Label>
              <Select value={selectedInspector} onValueChange={setSelectedInspector}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Inspectors</SelectItem>
                  {MOCK_INSPECTORS.map((inspector) => (
                    <SelectItem key={inspector.id} value={inspector.id}>
                      {inspector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Number</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Week Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Planned Visits</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.planNumber}</TableCell>
                  <TableCell>{plan.inspectorName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{plan.weekStartDate} - {plan.weekEndDate}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(plan.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(plan.status)}
                        {plan.status.replace('PLAN_', '').replace('_', ' ')}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>{plan.totalPlannedVisits}</TableCell>
                  <TableCell>{plan.completedVisits}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPlan(plan)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Plan Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Weekly Plan</DialogTitle>
            <DialogDescription>
              Create a new weekly plan with scheduled employer visits
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inspector">Inspector *</Label>
                <Select
                  value={newPlan.inspectorId}
                  onValueChange={(value) => setNewPlan(prev => ({ ...prev, inspectorId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select inspector" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_INSPECTORS.map((inspector) => (
                      <SelectItem key={inspector.id} value={inspector.id}>
                        {inspector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekStart">Week Start *</Label>
                <Input
                  id="weekStart"
                  type="date"
                  value={newPlan.weekStartDate}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, weekStartDate: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekEnd">Week End *</Label>
                <Input
                  id="weekEnd"
                  type="date"
                  value={newPlan.weekEndDate}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, weekEndDate: e.target.value }))}
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Planned Visit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employerName">Employer Name *</Label>
                    <Input
                      id="employerName"
                      placeholder="Enter employer name"
                      value={newVisit.employerName}
                      onChange={(e) => setNewVisit(prev => ({ ...prev, employerName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visitType">Visit Type *</Label>
                    <Select
                      value={newVisit.visitType}
                      onValueChange={(value) => setNewVisit(prev => ({ ...prev, visitType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="C3_FOLLOW_UP">C3 Follow-Up</SelectItem>
                        <SelectItem value="PAYMENT_FOLLOW_UP">Payment Follow-Up</SelectItem>
                        <SelectItem value="AUDIT">Audit</SelectItem>
                        <SelectItem value="INSPECTION">Inspection</SelectItem>
                        <SelectItem value="SCOUTING">Scouting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate">Scheduled Date *</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={newVisit.scheduledDate}
                      onChange={(e) => setNewVisit(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose *</Label>
                    <Input
                      id="purpose"
                      placeholder="Purpose of visit"
                      value={newVisit.purpose}
                      onChange={(e) => setNewVisit(prev => ({ ...prev, purpose: e.target.value }))}
                    />
                  </div>
                </div>

                <Button type="button" onClick={handleAddVisit} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Visit to Plan
                </Button>
              </CardContent>
            </Card>

            {newPlan.visits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Planned Visits ({newPlan.visits.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employer</TableHead>
                        <TableHead>Visit Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newPlan.visits.map((visit) => (
                        <TableRow key={visit.id}>
                          <TableCell className="font-medium">{visit.employerName}</TableCell>
                          <TableCell>{visit.visitType.replace(/_/g, ' ')}</TableCell>
                          <TableCell>{visit.scheduledDate}</TableCell>
                          <TableCell>{visit.purpose}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveVisit(visit.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlan}>Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Plan Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Weekly Plan Details</DialogTitle>
            <DialogDescription>
              {selectedPlan?.planNumber} - {selectedPlan?.inspectorName}
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Week Period</Label>
                  <p className="font-medium">
                    {selectedPlan.weekStartDate} - {selectedPlan.weekEndDate}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedPlan.status)}>
                      {selectedPlan.status.replace('PLAN_', '').replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Planned Visits</Label>
                  <p className="font-medium">{selectedPlan.totalPlannedVisits}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Completed Visits</Label>
                  <p className="font-medium text-green-600">{selectedPlan.completedVisits}</p>
                </div>
              </div>

              {selectedPlan.supervisorComments && (
                <div>
                  <Label className="text-muted-foreground">Supervisor Comments</Label>
                  <Card className="mt-2">
                    <CardContent className="pt-4">
                      <p className="text-sm">{selectedPlan.supervisorComments}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
