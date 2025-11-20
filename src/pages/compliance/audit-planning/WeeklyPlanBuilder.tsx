import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Plus, Trash2, Clock, MapPin, Save, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  VisitType, 
  VisitDuration, 
  CreateWeeklyPlanRequest 
} from '@/types/weeklyAuditPlan';
import { weeklyAuditPlanService } from '@/services/weeklyAuditPlanService';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

interface VisitFormData {
  dayOfWeek: typeof DAYS_OF_WEEK[number];
  visitDate: string;
  employerId: string;
  employerName: string;
  visitType: VisitType;
  duration: VisitDuration;
  purpose: string;
  plannedStartTime: string;
  plannedEndTime: string;
}

export default function WeeklyPlanBuilder() {
  const { toast } = useToast();
  const [inspectorId] = useState('inspector-001'); // Would come from auth context
  const [weekStartDate, setWeekStartDate] = useState('');
  const [weekEndDate, setWeekEndDate] = useState('');
  const [visits, setVisits] = useState<VisitFormData[]>([]);
  const [currentVisit, setCurrentVisit] = useState<Partial<VisitFormData>>({
    visitType: VisitType.AUDIT,
    duration: VisitDuration.FULL_DAY
  });

  const handleAddVisit = () => {
    if (!currentVisit.dayOfWeek || !currentVisit.visitDate || !currentVisit.employerName || 
        !currentVisit.purpose || !currentVisit.plannedStartTime || !currentVisit.plannedEndTime) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all visit details',
        variant: 'destructive'
      });
      return;
    }

    setVisits([...visits, currentVisit as VisitFormData]);
    setCurrentVisit({
      visitType: VisitType.AUDIT,
      duration: VisitDuration.FULL_DAY
    });
    
    toast({
      title: 'Visit Added',
      description: 'Visit has been added to the weekly plan'
    });
  };

  const handleRemoveVisit = (index: number) => {
    setVisits(visits.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    if (!weekStartDate || !weekEndDate || visits.length === 0) {
      toast({
        title: 'Cannot Save',
        description: 'Please add week dates and at least one visit',
        variant: 'destructive'
      });
      return;
    }

    try {
      const request: CreateWeeklyPlanRequest = {
        inspectorId,
        weekStartDate,
        weekEndDate,
        visits: visits.map(v => ({
          dayOfWeek: v.dayOfWeek,
          visitDate: v.visitDate,
          employerId: v.employerId || `emp-${Date.now()}`,
          employerName: v.employerName,
          visitType: v.visitType,
          duration: v.duration,
          purpose: v.purpose,
          plannedStartTime: v.plannedStartTime,
          plannedEndTime: v.plannedEndTime
        }))
      };

      await weeklyAuditPlanService.create(request);
      
      toast({
        title: 'Draft Saved',
        description: 'Weekly plan saved as draft'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save plan',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async () => {
    if (!weekStartDate || !weekEndDate || visits.length === 0) {
      toast({
        title: 'Cannot Submit',
        description: 'Please add week dates and at least one visit',
        variant: 'destructive'
      });
      return;
    }

    try {
      const request: CreateWeeklyPlanRequest = {
        inspectorId,
        weekStartDate,
        weekEndDate,
        visits: visits.map(v => ({
          dayOfWeek: v.dayOfWeek,
          visitDate: v.visitDate,
          employerId: v.employerId || `emp-${Date.now()}`,
          employerName: v.employerName,
          visitType: v.visitType,
          duration: v.duration,
          purpose: v.purpose,
          plannedStartTime: v.plannedStartTime,
          plannedEndTime: v.plannedEndTime
        }))
      };

      const plan = await weeklyAuditPlanService.create(request);
      await weeklyAuditPlanService.submit(plan.id);
      
      toast({
        title: 'Plan Submitted',
        description: 'Weekly plan submitted for review'
      });
      
      // Reset form
      setWeekStartDate('');
      setWeekEndDate('');
      setVisits([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit plan',
        variant: 'destructive'
      });
    }
  };

  const getVisitsByDay = (day: typeof DAYS_OF_WEEK[number]) => {
    return visits.filter(v => v.dayOfWeek === day);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Weekly Plan Builder"
        subtitle="Create and manage your weekly audit and inspection schedule"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Audit Planning', href: '/compliance/audit-planning/sampling-dashboard' },
          { label: 'Weekly Plan Builder' }
        ]}
      />

      {/* Week Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Week Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Week Start (Monday) *</Label>
              <Input
                type="date"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Week End (Sunday) *</Label>
              <Input
                type="date"
                value={weekEndDate}
                onChange={(e) => setWeekEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Visit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Planned Visit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Day of Week *</Label>
              <Select
                value={currentVisit.dayOfWeek}
                onValueChange={(value) => setCurrentVisit({ ...currentVisit, dayOfWeek: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(day => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Visit Date *</Label>
              <Input
                type="date"
                value={currentVisit.visitDate}
                onChange={(e) => setCurrentVisit({ ...currentVisit, visitDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Employer Name *</Label>
              <Input
                placeholder="Enter employer name"
                value={currentVisit.employerName}
                onChange={(e) => setCurrentVisit({ ...currentVisit, employerName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Visit Type *</Label>
              <Select
                value={currentVisit.visitType}
                onValueChange={(value) => setCurrentVisit({ ...currentVisit, visitType: value as VisitType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={VisitType.AUDIT}>Full Audit</SelectItem>
                  <SelectItem value={VisitType.RISK_BASED_AUDIT}>Risk-Based Audit</SelectItem>
                  <SelectItem value={VisitType.INSPECTION}>Inspection</SelectItem>
                  <SelectItem value={VisitType.C3_FOLLOW_UP}>C3 Follow-Up</SelectItem>
                  <SelectItem value={VisitType.PAYMENT_FOLLOW_UP}>Payment Follow-Up</SelectItem>
                  <SelectItem value={VisitType.SCOUTING}>Scouting</SelectItem>
                  <SelectItem value={VisitType.COMPLAINT_INVESTIGATION}>Complaint Investigation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration *</Label>
              <Select
                value={currentVisit.duration}
                onValueChange={(value) => setCurrentVisit({ ...currentVisit, duration: value as VisitDuration })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={VisitDuration.SHORT}>Short (1-2 hours)</SelectItem>
                  <SelectItem value={VisitDuration.HALF_DAY_AM}>Half Day (AM)</SelectItem>
                  <SelectItem value={VisitDuration.HALF_DAY_PM}>Half Day (PM)</SelectItem>
                  <SelectItem value={VisitDuration.FULL_DAY}>Full Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Planned Start Time *</Label>
              <Input
                type="time"
                value={currentVisit.plannedStartTime}
                onChange={(e) => setCurrentVisit({ ...currentVisit, plannedStartTime: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Planned End Time *</Label>
              <Input
                type="time"
                value={currentVisit.plannedEndTime}
                onChange={(e) => setCurrentVisit({ ...currentVisit, plannedEndTime: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Purpose / Reason *</Label>
              <Textarea
                placeholder="Describe the purpose of this visit"
                value={currentVisit.purpose}
                onChange={(e) => setCurrentVisit({ ...currentVisit, purpose: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <Button onClick={handleAddVisit} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Visit to Plan
          </Button>
        </CardContent>
      </Card>

      {/* Weekly Calendar View */}
      {visits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule ({visits.length} visits planned)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {DAYS_OF_WEEK.map(day => {
              const dayVisits = getVisitsByDay(day);
              return (
                <div key={day} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {day}
                    {dayVisits.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        ({dayVisits.length} visit{dayVisits.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </h3>
                  
                  {dayVisits.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No visits planned</p>
                  ) : (
                    <div className="space-y-2">
                      {dayVisits.map((visit, idx) => (
                        <div key={idx} className="bg-muted/50 p-3 rounded-md flex justify-between items-start">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {visit.plannedStartTime} - {visit.plannedEndTime}
                              </span>
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                {visit.duration.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{visit.employerName}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{visit.purpose}</p>
                            <p className="text-xs text-muted-foreground">
                              Type: {visit.visitType.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveVisit(visits.indexOf(visit))}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={handleSaveDraft}>
          <Save className="h-4 w-4 mr-2" />
          Save as Draft
        </Button>
        <Button onClick={handleSubmit}>
          <Send className="h-4 w-4 mr-2" />
          Submit for Review
        </Button>
      </div>
    </div>
  );
}
