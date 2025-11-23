import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle, XCircle, Calendar, Building2, MapPin, AlertCircle, Clock, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PlanItem {
  id: string;
  dayOfWeek: string;
  employerName: string;
  territory: string;
  visitType: string;
  purpose: string;
  plannedStartTime: string;
  plannedEndTime: string;
}

interface RiskItem {
  id: string;
  employerName: string;
  territory: string;
  riskLevel: 'Critical' | 'High' | 'Medium';
  riskScore: number;
  reason: string;
  inPlan: boolean;
}

interface PendingAction {
  id: string;
  violationNumber: string;
  employerName: string;
  territory: string;
  actionType: string;
  priority: 'Urgent' | 'High' | 'Normal';
  dueDate: string;
  inPlan: boolean;
}

interface PendingViolation {
  id: string;
  violationNumber: string;
  employerName: string;
  territory: string;
  violationType: string;
  status: string;
  createdDate: string;
  inPlan: boolean;
}

export function WeeklyPlanReview() {
  const navigate = useNavigate();
  const { planId } = useParams();
  const { toast } = useToast();
  const [managerComments, setManagerComments] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data
  const planDetails = {
    inspectorName: 'John Inspector',
    weekStart: '2024-01-22',
    weekEnd: '2024-01-28',
    status: 'Submitted',
    submittedAt: '2024-01-19T15:30:00Z'
  };

  const planItems: PlanItem[] = [
    {
      id: 'item-1',
      dayOfWeek: 'Monday',
      employerName: 'Retail Services Inc',
      territory: 'St Kitts',
      visitType: 'Regular Audit',
      purpose: 'Annual compliance audit',
      plannedStartTime: '08:00',
      plannedEndTime: '10:00'
    },
    {
      id: 'item-2',
      dayOfWeek: 'Tuesday',
      employerName: 'Tech Solutions Ltd',
      territory: 'St Kitts',
      visitType: 'Follow-up Visit',
      purpose: 'Verify C3 submission',
      plannedStartTime: '09:00',
      plannedEndTime: '10:00'
    }
  ];

  const highRiskItems: RiskItem[] = [
    {
      id: 'risk-1',
      employerName: 'ABC Construction Ltd',
      territory: 'St Kitts',
      riskLevel: 'Critical',
      riskScore: 95,
      reason: 'Arrears >XCD 200k, 6+ months missed C3, High-risk sector',
      inPlan: false
    },
    {
      id: 'risk-2',
      employerName: 'Retail Services Inc',
      territory: 'St Kitts',
      riskLevel: 'High',
      riskScore: 78,
      reason: 'Not audited in 24 months, Moderate arrears',
      inPlan: true
    },
    {
      id: 'risk-3',
      employerName: 'Paradise Hotel Group',
      territory: 'Nevis',
      riskLevel: 'Critical',
      riskScore: 92,
      reason: 'Payment arrangement defaulted twice, Arrears >XCD 150k',
      inPlan: false
    }
  ];

  const pendingActions: PendingAction[] = [
    {
      id: 'action-1',
      violationNumber: 'VIOA-2024-001',
      employerName: 'ABC Construction Ltd',
      territory: 'St Kitts',
      actionType: 'Employer Visit',
      priority: 'Urgent',
      dueDate: '2024-01-23',
      inPlan: false
    },
    {
      id: 'action-2',
      violationNumber: 'VIOA-2024-005',
      employerName: 'Tech Solutions Ltd',
      territory: 'St Kitts',
      actionType: 'Follow-up Payment',
      priority: 'High',
      dueDate: '2024-01-24',
      inPlan: true
    }
  ];

  const pendingViolations: PendingViolation[] = [
    {
      id: 'viol-1',
      violationNumber: 'VIOA-2024-001',
      employerName: 'ABC Construction Ltd',
      territory: 'St Kitts',
      violationType: 'C3 Not Submitted',
      status: 'Open',
      createdDate: '2024-01-10',
      inPlan: false
    },
    {
      id: 'viol-2',
      violationNumber: 'VIOA-2024-002',
      employerName: 'Retail Services Inc',
      territory: 'St Kitts',
      violationType: 'Late C3 Submission',
      status: 'Under Investigation',
      createdDate: '2024-01-12',
      inPlan: true
    }
  ];

  const handleApprove = () => {
    setIsLoading(true);
    setTimeout(() => {
      toast({
        title: 'Plan Approved',
        description: 'The weekly plan has been approved successfully'
      });
      setIsLoading(false);
      navigate('/compliance/audit-planning/pending-review');
    }, 1000);
  };

  const handleRequestChanges = () => {
    if (!managerComments.trim()) {
      toast({
        title: 'Comments Required',
        description: 'Please provide comments explaining the requested changes',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      toast({
        title: 'Changes Requested',
        description: 'The plan has been sent back to the inspector with your comments'
      });
      setIsLoading(false);
      navigate('/compliance/audit-planning/pending-review');
    }, 1000);
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const unaddressedRisks = highRiskItems.filter(r => !r.inPlan && (r.riskLevel === 'Critical' || r.riskLevel === 'High'));
  const unaddressedActions = pendingActions.filter(a => !a.inPlan && (a.priority === 'Urgent' || a.priority === 'High'));
  const unaddressedViolations = pendingViolations.filter(v => !v.inPlan);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Weekly Plan"
        breadcrumbs={[
          { label: 'Compliance' },
          { label: 'Audit Planning' },
          { label: 'Pending Review' },
          { label: 'Review Plan' }
        ]}
      />

      {/* Plan Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Plan Details</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Week of {planDetails.weekStart} to {planDetails.weekEnd}
              </p>
            </div>
            <Badge variant="outline">{planDetails.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Inspector</p>
              <p className="font-semibold">{planDetails.inspectorName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="font-semibold">{new Date(planDetails.submittedAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="font-semibold">{planItems.length} visits planned</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vetting Dashboard */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Unaddressed Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{unaddressedRisks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">High/Critical risk employers not in plan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-500" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{unaddressedActions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Urgent/High priority actions not in plan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Open Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{unaddressedViolations.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Violations without planned follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Guidance Alert */}
      {(unaddressedRisks.length > 0 || unaddressedActions.length > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              Manager Guidance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {unaddressedRisks.length > 0 && (
              <p>• {unaddressedRisks.length} high-risk employer{unaddressedRisks.length > 1 ? 's' : ''} not included in this week's plan. Consider requesting inspector to add these for priority coverage.</p>
            )}
            {unaddressedActions.length > 0 && (
              <p>• {unaddressedActions.length} urgent/high priority action{unaddressedActions.length > 1 ? 's' : ''} not scheduled. These should be addressed this week if possible.</p>
            )}
            {unaddressedViolations.length > 0 && (
              <p>• {unaddressedViolations.length} open violation{unaddressedViolations.length > 1 ? 's' : ''} without planned follow-up. Review if follow-up actions are needed.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabbed Vetting Details */}
      <Tabs defaultValue="plan" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="plan">Planned Items ({planItems.length})</TabsTrigger>
          <TabsTrigger value="risks">
            High Risks ({highRiskItems.length})
            {unaddressedRisks.length > 0 && (
              <Badge variant="destructive" className="ml-2">{unaddressedRisks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actions">
            Pending Actions ({pendingActions.length})
            {unaddressedActions.length > 0 && (
              <Badge variant="destructive" className="ml-2">{unaddressedActions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="violations">
            Violations ({pendingViolations.length})
            {unaddressedViolations.length > 0 && (
              <Badge variant="destructive" className="ml-2">{unaddressedViolations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Planned Visits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {planItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{item.employerName}</span>
                      </div>
                      <Badge variant="outline">{item.dayOfWeek}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{item.territory}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{item.plannedStartTime} - {item.plannedEndTime}</span>
                      </div>
                      <div>
                        <Badge variant="secondary" className="text-xs">{item.visitType}</Badge>
                      </div>
                    </div>
                    <p className="text-sm">{item.purpose}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>High-Risk Employers</CardTitle>
              <p className="text-sm text-muted-foreground">
                Employers with elevated risk scores that may require attention
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {highRiskItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{item.employerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRiskBadgeColor(item.riskLevel)}>
                          {item.riskLevel} ({item.riskScore})
                        </Badge>
                        {item.inPlan ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{item.territory}</span>
                    </div>
                    <p className="text-sm">{item.reason}</p>
                    <div className="text-xs">
                      {item.inPlan ? (
                        <span className="text-green-600 font-medium">✓ Included in plan</span>
                      ) : (
                        <span className="text-red-600 font-medium">✗ Not in plan - Consider adding</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Actions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Outstanding follow-up actions assigned to this inspector
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingActions.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {item.violationNumber}
                          </Badge>
                          <Badge className={getPriorityColor(item.priority)}>
                            {item.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{item.employerName}</span>
                        </div>
                      </div>
                      {item.inPlan ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{item.territory}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">{item.actionType}</Badge>
                    <div className="text-xs">
                      {item.inPlan ? (
                        <span className="text-green-600 font-medium">✓ Included in plan</span>
                      ) : (
                        <span className="text-red-600 font-medium">✗ Not in plan - Should be addressed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Violations</CardTitle>
              <p className="text-sm text-muted-foreground">
                Violations in inspector's zone requiring follow-up
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingViolations.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {item.violationNumber}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{item.employerName}</span>
                        </div>
                      </div>
                      {item.inPlan ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{item.territory}</span>
                      </div>
                      <div>
                        <Badge variant="secondary" className="text-xs">{item.status}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(item.createdDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="text-sm">{item.violationType}</p>
                    <div className="text-xs">
                      {item.inPlan ? (
                        <span className="text-green-600 font-medium">✓ Follow-up planned</span>
                      ) : (
                        <span className="text-orange-600 font-medium">⚠ No follow-up scheduled</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manager Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Manager Review & Comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="comments">Comments / Feedback</Label>
            <Textarea
              id="comments"
              placeholder="Provide feedback or guidance for the inspector..."
              value={managerComments}
              onChange={(e) => setManagerComments(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => navigate('/compliance/audit-planning/pending-review')}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleRequestChanges}
              disabled={isLoading}
            >
              Request Changes
            </Button>
            <Button onClick={handleApprove} disabled={isLoading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
