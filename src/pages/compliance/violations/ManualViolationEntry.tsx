import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViolationType } from '@/types/violation';
import { violationService } from '@/services/violationService';
import { toast } from 'sonner';

export default function ManualViolationEntry() {
  const navigate = useNavigate();
  const [entryType, setEntryType] = useState<'employer' | 'scouting'>('employer');
  
  // Common fields
  const [violationType, setViolationType] = useState<ViolationType>(ViolationType.OTHER);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [territory, setTerritory] = useState<'St Kitts' | 'Nevis'>('St Kitts');
  const [assignToMe, setAssignToMe] = useState(true);
  const [dueDate, setDueDate] = useState('');
  
  // Employer-based fields
  const [employerId, setEmployerId] = useState('');
  
  // Scouting-based fields
  const [candidateBusinessName, setCandidateBusinessName] = useState('');
  const [candidateLocation, setCandidateLocation] = useState('');
  const [candidateActivityType, setCandidateActivityType] = useState('');
  const [estimatedEmployees, setEstimatedEmployees] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (entryType === 'employer' && !employerId) {
      toast.error('Please enter an Employer ID');
      return;
    }

    if (entryType === 'scouting' && !candidateBusinessName) {
      toast.error('Please enter Business Name');
      return;
    }

    try {
      setLoading(true);
      
      const newViolation = await violationService.create({
        employerId: entryType === 'employer' ? employerId : undefined,
        violationType,
        priority,
        summary,
        description,
        isUnlinked: entryType === 'scouting',
        candidateBusinessName: entryType === 'scouting' ? candidateBusinessName : undefined,
        candidateLocation: entryType === 'scouting' ? candidateLocation : undefined,
        candidateActivityType: entryType === 'scouting' ? candidateActivityType : undefined,
        estimatedEmployees: entryType === 'scouting' ? parseInt(estimatedEmployees) || undefined : undefined,
        assignedToUserId: assignToMe ? 'inspector-001' : undefined,
        dueDate: dueDate || undefined
      });

      toast.success('Violation created successfully');
      navigate(`/compliance/violations/${newViolation.id}`);
    } catch (error) {
      toast.error('Failed to create violation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manual Violation Entry"
        subtitle="Create a violation manually from field observations or desk review"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Violations', href: '/compliance/violations' },
          { label: 'Manual Entry' }
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Violation Entry Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={entryType} onValueChange={(value: any) => setEntryType(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="employer">Registered Employer</TabsTrigger>
              <TabsTrigger value="scouting">Scouting / Unregistered</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <TabsContent value="employer" className="space-y-4">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="text-sm font-medium mb-1">Employer-Based Violation</div>
                  <div className="text-sm text-muted-foreground">
                    Use this when creating a violation for a registered employer (has an Employer ID)
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Employer ID *</Label>
                  <Input
                    value={employerId}
                    onChange={(e) => setEmployerId(e.target.value)}
                    placeholder="EMP-2024-001"
                    required={entryType === 'employer'}
                  />
                </div>
              </TabsContent>

              <TabsContent value="scouting" className="space-y-4">
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="text-sm font-medium mb-1">Scouting Violation (Unlinked)</div>
                  <div className="text-sm text-muted-foreground">
                    Use this for businesses found during scouting that don't have an Employer ID yet. You can link this violation later when the business registers.
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Business Name *</Label>
                  <Input
                    value={candidateBusinessName}
                    onChange={(e) => setCandidateBusinessName(e.target.value)}
                    placeholder="Name on signage or as known locally"
                    required={entryType === 'scouting'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Location *</Label>
                  <Input
                    value={candidateLocation}
                    onChange={(e) => setCandidateLocation(e.target.value)}
                    placeholder="Address, landmark, or GPS coordinates"
                    required={entryType === 'scouting'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Activity Type</Label>
                    <Input
                      value={candidateActivityType}
                      onChange={(e) => setCandidateActivityType(e.target.value)}
                      placeholder="e.g. Construction, Retail, Restaurant"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Estimated Employees</Label>
                    <Input
                      type="number"
                      value={estimatedEmployees}
                      onChange={(e) => setEstimatedEmployees(e.target.value)}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Common Fields */}
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Territory *</Label>
                    <Select value={territory} onValueChange={(value: any) => setTerritory(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="St Kitts">St Kitts</SelectItem>
                        <SelectItem value="Nevis">Nevis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Violation Type *</Label>
                    <Select value={violationType} onValueChange={(value: any) => setViolationType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ViolationType.NON_REGISTRATION}>Non-Registration</SelectItem>
                        <SelectItem value={ViolationType.UNDER_REPORTING}>Under-Reporting</SelectItem>
                        <SelectItem value={ViolationType.LATE_SUBMISSION}>Late Submission</SelectItem>
                        <SelectItem value={ViolationType.LATE_PAYMENT}>Late Payment</SelectItem>
                        <SelectItem value={ViolationType.NON_PAYMENT}>Non-Payment</SelectItem>
                        <SelectItem value={ViolationType.WAGE_BOOK_VIOLATION}>Wage Book Violation</SelectItem>
                        <SelectItem value={ViolationType.EMPLOYEE_MISCLASSIFICATION}>Employee Misclassification</SelectItem>
                        <SelectItem value={ViolationType.UNREPORTED_EMPLOYEE}>Unreported Employee</SelectItem>
                        <SelectItem value={ViolationType.UNREGISTERED_BUSINESS_ACTIVITY}>Unregistered Business Activity</SelectItem>
                        <SelectItem value={ViolationType.OTHER}>Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Summary *</Label>
                  <Input
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Brief violation summary (one line)"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Detailed Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed description of the violation, circumstances, and observations..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority *</Label>
                    <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date (Optional)</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="assign-me"
                    checked={assignToMe}
                    onCheckedChange={(checked) => setAssignToMe(checked as boolean)}
                  />
                  <label
                    htmlFor="assign-me"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Assign to me
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/compliance/violations')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Violation'}
                </Button>
              </div>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
