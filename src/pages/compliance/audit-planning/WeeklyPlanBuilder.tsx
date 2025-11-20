import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Plus, Trash2, Clock, MapPin, Save, Send, Search, Building2, AlertCircle, AlertTriangle, FileText, Gavel, TrendingUp, GraduationCap, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  VisitType, 
  VisitDuration, 
  CreateWeeklyPlanRequest 
} from '@/types/weeklyAuditPlan';
import { weeklyAuditPlanService } from '@/services/weeklyAuditPlanService';
import { employersAdapter, Employer } from '@/adapters/employersAdapter';
import { supabase } from '@/integrations/supabase/client';

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
  isUnplannedSighting?: boolean;
  sightingLocation?: string;
}

export default function WeeklyPlanBuilder() {
  const { toast } = useToast();
  const [inspectorId] = useState('inspector-001'); // Would come from auth context
  const [inspectorZone] = useState('Zone A'); // Would come from auth context
  const [weekStartDate, setWeekStartDate] = useState('');
  const [weekEndDate, setWeekEndDate] = useState('');
  const [visits, setVisits] = useState<VisitFormData[]>([]);
  const [currentVisit, setCurrentVisit] = useState<Partial<VisitFormData>>({
    visitType: VisitType.AUDIT,
    duration: VisitDuration.FULL_DAY,
    isUnplannedSighting: false
  });
  
  // Risk-based suggestions
  const [suggestedEmployers, setSuggestedEmployers] = useState<Employer[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  
  // Employer search
  const [employerSearchQuery, setEmployerSearchQuery] = useState('');
  const [employerSearchResults, setEmployerSearchResults] = useState<Employer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  
  // Date picker dialog for "Add to Plan"
  const [datePickerDialog, setDatePickerDialog] = useState<{
    open: boolean;
    employer: Employer | null;
    visitType: VisitType | null;
    purpose: string;
  }>({
    open: false,
    employer: null,
    visitType: null,
    purpose: ''
  });
  
  const [aiAssistantLoading, setAiAssistantLoading] = useState(false);

  // Load risk-based suggestions
  useEffect(() => {
    loadRiskBasedSuggestions();
  }, []);

  const loadRiskBasedSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      // Get all employers in inspector's zone, sorted by risk (highest first)
      const employers = await employersAdapter.getAllByZone(inspectorZone);
      setSuggestedEmployers(employers);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load risk-based suggestions',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleEmployerSearch = async () => {
    if (!employerSearchQuery.trim()) {
      toast({
        title: 'Search Required',
        description: 'Please enter employer name or code',
        variant: 'destructive'
      });
      return;
    }

    setIsSearching(true);
    try {
      const results = await employersAdapter.search(employerSearchQuery);
      setEmployerSearchResults(results);
      
      if (results.length === 0) {
        toast({
          title: 'No Results',
          description: 'No employers found matching your search'
        });
      }
    } catch (error) {
      toast({
        title: 'Search Error',
        description: 'Failed to search employers',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectEmployer = (employer: Employer) => {
    setSelectedEmployer(employer);
    setCurrentVisit({
      ...currentVisit,
      employerId: employer.regNo,
      employerName: employer.name
    });
    setEmployerSearchResults([]);
    setEmployerSearchQuery('');
  };

  const handleQuickAddFromSuggestion = (employer: Employer, visitType: VisitType, purpose: string) => {
    // Open date picker dialog instead of directly adding
    setDatePickerDialog({
      open: true,
      employer,
      visitType,
      purpose
    });
  };
  
  const handleDateSelection = (selectedDay: typeof DAYS_OF_WEEK[number]) => {
    if (!datePickerDialog.employer || !datePickerDialog.visitType) return;
    
    const newVisit: Partial<VisitFormData> = {
      dayOfWeek: selectedDay,
      employerId: datePickerDialog.employer.regNo,
      employerName: datePickerDialog.employer.name,
      visitType: datePickerDialog.visitType,
      duration: VisitDuration.FULL_DAY,
      purpose: datePickerDialog.purpose,
      isUnplannedSighting: false
    };

    // Scroll to the form and pre-fill it
    setCurrentVisit(newVisit);
    setSelectedEmployer(datePickerDialog.employer);
    
    // Close dialog
    setDatePickerDialog({
      open: false,
      employer: null,
      visitType: null,
      purpose: ''
    });
    
    toast({
      title: 'Employer Added',
      description: `${datePickerDialog.employer.name} added for ${selectedDay}. Complete remaining details below.`
    });
    
    // Scroll to form
    const formElement = document.getElementById('visit-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const getRiskBadgeColor = (riskBand: string) => {
    switch (riskBand) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleClearEmployer = () => {
    setSelectedEmployer(null);
    setCurrentVisit({
      ...currentVisit,
      employerId: '',
      employerName: ''
    });
  };

  const handleToggleUnplannedSighting = (checked: boolean) => {
    if (checked) {
      handleClearEmployer();
    }
    setCurrentVisit({
      ...currentVisit,
      isUnplannedSighting: checked,
      visitType: checked ? VisitType.SCOUTING : VisitType.AUDIT
    });
  };

  const handleAddVisit = () => {
    // Validation
    if (!currentVisit.dayOfWeek || !currentVisit.visitDate || 
        !currentVisit.purpose || !currentVisit.plannedStartTime || !currentVisit.plannedEndTime) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required visit details',
        variant: 'destructive'
      });
      return;
    }

    // Check employer or unplanned sighting
    if (!currentVisit.isUnplannedSighting && !currentVisit.employerName) {
      toast({
        title: 'Employer Required',
        description: 'Please select an employer or mark as unplanned sighting',
        variant: 'destructive'
      });
      return;
    }

    if (currentVisit.isUnplannedSighting && !currentVisit.sightingLocation) {
      toast({
        title: 'Location Required',
        description: 'Please provide location for unplanned sighting',
        variant: 'destructive'
      });
      return;
    }

    setVisits([...visits, currentVisit as VisitFormData]);
    setCurrentVisit({
      visitType: VisitType.AUDIT,
      duration: VisitDuration.FULL_DAY,
      isUnplannedSighting: false
    });
    setSelectedEmployer(null);
    
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
  
  const handleAIAssist = async () => {
    setAiAssistantLoading(true);
    try {
      // Gather all relevant data for AI analysis
      const requestData = {
        inspectorName: 'John Inspector', // TODO: Get from auth context
        inspectorZone: inspectorZone,
        weekStartDate,
        weekEndDate,
        employers: suggestedEmployers.map(emp => ({
          regNo: emp.regNo,
          name: emp.name,
          zone: emp.zone,
          riskRating: emp.riskRating,
          riskBand: emp.riskBand,
          lastAuditDate: emp.lastAuditDate,
          outstandingBalance: emp.outstandingBalance,
          lastC3Status: emp.lastC3Status,
          lastC3Date: emp.lastC3Date
        })),
        riskScores: suggestedEmployers.map(emp => ({
          employerId: emp.regNo,
          score: emp.riskRating,
          band: emp.riskBand
        })),
        arrearsData: suggestedEmployers.filter(emp => emp.outstandingBalance && emp.outstandingBalance > 0).map(emp => ({
          employerId: emp.regNo,
          employerName: emp.name,
          outstanding: emp.outstandingBalance,
          components: { SSC: 0, SSF: 0, LVC: 0, LVF: 0, PEC: 0, PEF: 0 } // TODO: Get real component breakdown
        })),
        c3Data: suggestedEmployers.map(emp => ({
          employerId: emp.regNo,
          lastSubmission: emp.lastC3Date,
          status: emp.lastC3Status
        })),
        scoutingHotspots: [
          { area: 'Basseterre Downtown', reason: 'New construction activity' },
          { area: 'Frigate Bay', reason: 'Tourism sector expansion' }
        ],
        lmsCourses: [
          { title: 'Compliance Procedures Update', status: 'In Progress', dueDate: '2025-10-05' },
          { title: 'Risk Assessment Framework', status: 'Not Started', dueDate: '2025-10-12' }
        ],
        existingSubcases: [] // TODO: Fetch from database
      };

      const { data, error } = await supabase.functions.invoke('compliance-intelligence', {
        body: requestData
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.success) {
        toast({
          title: 'AI Analysis Complete',
          description: 'Intelligent weekly plan generated successfully',
          variant: 'default'
        });
        
        // TODO: Process and display the AI-generated plan
        console.log('AI Generated Plan:', data.data);
      } else {
        throw new Error(data?.error || 'Failed to generate plan');
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      toast({
        title: 'AI Assistant Error',
        description: error instanceof Error ? error.message : 'Failed to generate intelligent plan',
        variant: 'destructive'
      });
    } finally {
      setAiAssistantLoading(false);
    }
  };

  // Filter suggested employers by category
  const highRiskEmployers = suggestedEmployers.filter(e => e.riskBand === 'Critical' || e.riskBand === 'High').slice(0, 10);
  const legalReadyEmployers = suggestedEmployers.filter(e => e.outstandingBalance && e.outstandingBalance > 50000).slice(0, 5);
  
  // Active Cases - combine C3 without payment and arrears cases
  const activeCases = [
    ...suggestedEmployers.filter(e => e.lastC3Status === 'submitted_no_payment').map(e => ({ ...e, caseType: 'C3 No Payment' as const })),
    ...suggestedEmployers.filter(e => e.outstandingBalance && e.outstandingBalance > 10000).map(e => ({ ...e, caseType: 'Arrears' as const }))
  ].slice(0, 10);
  
  // Mock LMS courses data
  const lmsCourses = [
    { id: 'LMS-001', title: 'Compliance Procedures Training', status: 'In Progress', dueDate: '2024-01-30', progress: 65 },
    { id: 'LMS-002', title: 'Risk Assessment Methodologies', status: 'Not Started', dueDate: '2024-02-15', progress: 0 },
    { id: 'LMS-003', title: 'Evidence Collection & Documentation', status: 'In Progress', dueDate: '2024-02-05', progress: 40 }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Weekly Plan Builder"
        subtitle="Create and manage your weekly audit and inspection schedule with risk-based suggestions"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Audit Planning', href: '/compliance/audit-planning/sampling-dashboard' },
          { label: 'Weekly Plan Builder' }
        ]}
      />

      {/* Risk-Based Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Risk-Based Suggestions for {inspectorZone}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Start with these high-priority employers sorted by risk rating (highest first). Click "Add to Plan" to quickly add them to your schedule.
          </p>
        </CardHeader>
        <CardContent>
          {isLoadingSuggestions ? (
            <div className="text-center py-8 text-muted-foreground">Loading suggestions...</div>
          ) : (
            <Tabs defaultValue="surveys" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="surveys">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Surveys ({highRiskEmployers.length})
                </TabsTrigger>
                <TabsTrigger value="legal">
                  <Gavel className="h-4 w-4 mr-2" />
                  Legal ({legalReadyEmployers.length})
                </TabsTrigger>
                <TabsTrigger value="active-cases">
                  <FileText className="h-4 w-4 mr-2" />
                  Active Cases ({activeCases.length})
                </TabsTrigger>
                <TabsTrigger value="lms">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  LMS Courses ({lmsCourses.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="surveys" className="space-y-2 mt-4">
                <div className="text-sm text-muted-foreground mb-3">
                  High/Critical risk employers requiring audit surveys (sorted by risk rating descending)
                </div>
                {highRiskEmployers.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">No high-risk employers in your zone</div>
                ) : (
                  highRiskEmployers.map((employer) => (
                    <div
                      key={employer.regNo}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{employer.name}</p>
                          <Badge className={getRiskBadgeColor(employer.riskBand)}>{employer.riskBand}</Badge>
                          <Badge variant="outline">Score: {employer.riskRating}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Code: {employer.regNo} • Last Audit: {employer.lastAuditDate || 'Never'} • 
                          Outstanding: ${employer.outstandingBalance?.toLocaleString() || '0'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleQuickAddFromSuggestion(
                          employer,
                          VisitType.RISK_BASED_AUDIT,
                          `Risk-based audit - ${employer.riskBand} risk rating (${employer.riskRating})`
                        )}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add to Plan
                      </Button>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="legal" className="space-y-2 mt-4">
                <div className="text-sm text-muted-foreground mb-3">
                  Employers recommended for legal action based on escalation thresholds
                </div>
                {legalReadyEmployers.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">No employers ready for legal escalation</div>
                ) : (
                  legalReadyEmployers.map((employer) => (
                    <div
                      key={employer.regNo}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{employer.name}</p>
                          <Badge variant="destructive">Legal Ready</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Code: {employer.regNo} • Outstanding: ${employer.outstandingBalance?.toLocaleString()} • 
                          Status: {employer.complianceStatus}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleQuickAddFromSuggestion(
                          employer,
                          VisitType.AUDIT,
                          `Pre-legal assessment - Outstanding balance $${employer.outstandingBalance?.toLocaleString()}`
                        )}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add to Plan
                      </Button>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="active-cases" className="space-y-2 mt-4">
                <div className="text-sm text-muted-foreground mb-3">
                  Active compliance cases requiring follow-up (C3 issues, arrears, payment plans, etc.)
                </div>
                {activeCases.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">No active cases requiring attention</div>
                ) : (
                  activeCases.map((employer) => (
                    <div
                      key={employer.regNo}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{employer.name}</p>
                          <Badge variant="outline" className={employer.caseType === 'C3 No Payment' ? 'bg-amber-50' : 'bg-red-50'}>
                            {employer.caseType}
                          </Badge>
                          <Badge className={getRiskBadgeColor(employer.riskBand)}>{employer.riskBand}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Code: {employer.regNo} • 
                          {employer.caseType === 'C3 No Payment' && ` Last C3: ${employer.lastC3Date || 'N/A'} •`}
                          {` Outstanding: $${employer.outstandingBalance?.toLocaleString() || '0'}`}
                          {employer.lastPaymentDate && ` • Last Payment: ${employer.lastPaymentDate}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleQuickAddFromSuggestion(
                          employer,
                          employer.caseType === 'C3 No Payment' ? VisitType.C3_FOLLOW_UP : VisitType.PAYMENT_FOLLOW_UP,
                          employer.caseType === 'C3 No Payment' 
                            ? `C3 submitted without payment - Follow up on outstanding contributions`
                            : `Arrears follow-up - $${employer.outstandingBalance?.toLocaleString()} outstanding`
                        )}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add to Plan
                      </Button>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="lms" className="space-y-2 mt-4">
                <div className="text-sm text-muted-foreground mb-3">
                  Learning Management System courses assigned to you for completion
                </div>
                {lmsCourses.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">No courses assigned</div>
                ) : (
                  <div className="space-y-3">
                    {lmsCourses.map((course) => (
                      <div
                        key={course.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <GraduationCap className="h-5 w-5 text-primary" />
                              <p className="font-semibold">{course.title}</p>
                              <Badge variant={course.status === 'In Progress' ? 'default' : 'secondary'}>
                                {course.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Course ID: {course.id}</span>
                              <span>Due: {course.dueDate}</span>
                              <span>Progress: {course.progress}%</span>
                            </div>
                            {course.progress > 0 && (
                              <div className="mt-2 w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full transition-all" 
                                  style={{ width: `${course.progress}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Note:</strong> Complete assigned LMS courses to maintain compliance inspector certification and stay current with policy updates.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

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
      <Card id="visit-form">
        <CardHeader>
          <CardTitle>Add Planned Visit</CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete the details below to add a visit to your weekly plan. You can also add employers manually here.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Unplanned Sighting Toggle */}
          <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Checkbox
              id="unplanned-sighting"
              checked={currentVisit.isUnplannedSighting}
              onCheckedChange={handleToggleUnplannedSighting}
            />
            <div className="flex-1">
              <Label htmlFor="unplanned-sighting" className="cursor-pointer flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="font-medium">Unplanned Sighting During Scouting</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Check this for construction sites or activities discovered during area scouting (no prior employer selection)
              </p>
            </div>
          </div>

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

            {/* Employer Search or Sighting Location */}
            {!currentVisit.isUnplannedSighting ? (
              <div className="space-y-2 col-span-2">
                <Label>Employer *</Label>
                {selectedEmployer ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <Building2 className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900 dark:text-green-100">{selectedEmployer.name}</p>
                      <p className="text-xs text-green-700 dark:text-green-300">Code: {selectedEmployer.regNo}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearEmployer}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search by name or code..."
                        value={employerSearchQuery}
                        onChange={(e) => setEmployerSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEmployerSearch()}
                      />
                      <Button
                        type="button"
                        onClick={handleEmployerSearch}
                        disabled={isSearching}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {employerSearchResults.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                        {employerSearchResults.map((employer) => (
                          <button
                            key={employer.regNo}
                            type="button"
                            onClick={() => handleSelectEmployer(employer)}
                            className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                          >
                            <p className="font-medium">{employer.name}</p>
                            <p className="text-xs text-muted-foreground">Code: {employer.regNo}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2 col-span-2">
                <Label>Sighting Location / Description *</Label>
                <Textarea
                  placeholder="e.g., Construction site on Main Street near Plaza, unregistered activity observed"
                  value={currentVisit.sightingLocation}
                  onChange={(e) => setCurrentVisit({ ...currentVisit, sightingLocation: e.target.value })}
                  rows={2}
                />
              </div>
            )}

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
                            {visit.isUnplannedSighting && (
                              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded mb-1">
                                <AlertCircle className="h-3 w-3" />
                                Unplanned Sighting
                              </span>
                            )}
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
                              <span className="font-medium">
                                {visit.isUnplannedSighting 
                                  ? visit.sightingLocation 
                                  : visit.employerName}
                              </span>
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
        <Button 
          variant="outline"
          onClick={handleAIAssist}
          disabled={aiAssistantLoading || !weekStartDate || !weekEndDate}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 border-0"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {aiAssistantLoading ? 'Analyzing...' : 'AI Assistant'}
        </Button>
        <Button variant="outline" onClick={handleSaveDraft}>
          <Save className="h-4 w-4 mr-2" />
          Save as Draft
        </Button>
        <Button onClick={handleSubmit}>
          <Send className="h-4 w-4 mr-2" />
          Submit for Review
        </Button>
      </div>

      {/* Date Picker Dialog */}
      <Dialog open={datePickerDialog.open} onOpenChange={(open) => setDatePickerDialog({ ...datePickerDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Day for Visit</DialogTitle>
            <DialogDescription>
              Choose which day next week to add this visit to your plan
              {datePickerDialog.employer && (
                <div className="mt-2 p-2 bg-muted rounded-md">
                  <p className="font-medium">{datePickerDialog.employer.name}</p>
                  <p className="text-xs text-muted-foreground">{datePickerDialog.purpose}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-4">
            {DAYS_OF_WEEK.map((day) => (
              <Button
                key={day}
                variant="outline"
                className="justify-start"
                onClick={() => handleDateSelection(day)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {day}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
