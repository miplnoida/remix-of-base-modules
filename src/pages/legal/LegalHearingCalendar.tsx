import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './LegalHearingCalendar.css';
import { useLegalHearings, useCreateHearing, useUpdateHearing, detectConflicts } from '@/hooks/useLegalHearings';
import { useLegalAuth } from '@/contexts/LegalAuthContext';
import { useLegalCases } from '@/hooks/useLegalCases';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  ArrowLeft,
  Home,
  LogOut,
  Plus,
  Calendar as CalendarIcon,
  List,
  Filter,
  Printer,
  Upload,
  Users,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { format, parse } from 'date-fns';
import { toast } from 'sonner';

const localizer = momentLocalizer(moment);

const HEARING_TYPES = ['Preliminary Hearing', 'Merits Hearing', 'Directions Hearing', 'Mediation'];
const VENUES = ['SSB Tribunal Room A', 'SSB Tribunal Room B', 'SSB Tribunal Room C', 'SSB Mediation Room'];

// Sample hearing data
const SAMPLE_HEARINGS = [
  {
    id: '1',
    case_id: 'CASE-001',
    type: 'Preliminary Hearing',
    venue: 'SSB Tribunal Room A',
    start_at: new Date(2025, 10, 10, 9, 0).toISOString(),
    end_at: new Date(2025, 10, 10, 11, 0).toISOString(),
    panel: ['Judge Sarah Johnson', 'Member David Lee'],
    legal_cases: { number: 'SSB-2025-001', title: 'Non-Compliance Case' }
  },
  {
    id: '2',
    case_id: 'CASE-002',
    type: 'Merits Hearing',
    venue: 'SSB Tribunal Room B',
    start_at: new Date(2025, 10, 12, 14, 0).toISOString(),
    end_at: new Date(2025, 10, 12, 16, 30).toISOString(),
    panel: ['Judge Michael Chen', 'Member Lisa Wang'],
    legal_cases: { number: 'SSB-2025-002', title: 'Benefit Dispute' }
  },
  {
    id: '3',
    case_id: 'CASE-003',
    type: 'Mediation',
    venue: 'SSB Mediation Room',
    start_at: new Date(2025, 10, 15, 10, 0).toISOString(),
    end_at: new Date(2025, 10, 15, 12, 0).toISOString(),
    panel: ['Mediator John Smith'],
    legal_cases: { number: 'SSB-2025-003', title: 'Appeal Case' }
  },
  {
    id: '4',
    case_id: 'CASE-004',
    type: 'Directions Hearing',
    venue: 'SSB Tribunal Room C',
    start_at: new Date(2025, 10, 18, 9, 30).toISOString(),
    end_at: new Date(2025, 10, 18, 10, 30).toISOString(),
    panel: ['Judge Sarah Johnson'],
    legal_cases: { number: 'SSB-2025-004', title: 'Recovery Action' }
  },
  {
    id: '5',
    case_id: 'CASE-005',
    type: 'Preliminary Hearing',
    venue: 'SSB Tribunal Room A',
    start_at: new Date(2025, 10, 20, 13, 0).toISOString(),
    end_at: new Date(2025, 10, 20, 15, 0).toISOString(),
    panel: ['Judge Michael Chen', 'Member David Lee', 'Member Lisa Wang'],
    legal_cases: { number: 'SSB-2025-005', title: 'Fraud Investigation' }
  }
];

export default function LegalHearingCalendar() {
  const navigate = useNavigate();
  const { signOut } = useLegalAuth();
  const { data: hearings, isLoading } = useLegalHearings();
  const { data: cases } = useLegalCases();
  
  // Use sample data if no hearings available
  const displayHearings = hearings && hearings.length > 0 ? hearings : SAMPLE_HEARINGS;
  const createHearing = useCreateHearing();
  const updateHearing = useUpdateHearing();

  const [date, setDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedHearing, setSelectedHearing] = useState<any>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Generate year options (current year +/- 2 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const monthOptions = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    case_id: '',
    type: '',
    venue: '',
    start_at: '',
    end_at: '',
    panel: [] as string[],
    agenda: '',
  });

  const [newPanelMember, setNewPanelMember] = useState('');
  const [conflicts, setConflicts] = useState<string[]>([]);

  // Convert hearings to calendar events
  const calendarEvents = useMemo(() => {
    return displayHearings.map((hearing) => ({
      id: hearing.id,
      title: `${hearing.legal_cases?.number || 'Unknown'} - ${hearing.type}`,
      start: new Date(hearing.start_at),
      end: new Date(hearing.end_at),
      resource: hearing,
    }));
  }, [displayHearings]);
  
  // Update date when year/month changes
  const handleYearChange = (year: string) => {
    const newYear = parseInt(year);
    setSelectedYear(newYear);
    setDate(new Date(newYear, selectedMonth, 1));
  };
  
  const handleMonthChange = (month: string) => {
    const newMonth = parseInt(month);
    setSelectedMonth(newMonth);
    setDate(new Date(selectedYear, newMonth, 1));
  };

  const handleScheduleFormChange = (field: string, value: any) => {
    setScheduleForm((prev) => ({ ...prev, [field]: value }));
  };

  const addPanelMember = () => {
    if (newPanelMember.trim() && !scheduleForm.panel.includes(newPanelMember.trim())) {
      setScheduleForm((prev) => ({
        ...prev,
        panel: [...prev.panel, newPanelMember.trim()],
      }));
      setNewPanelMember('');
    }
  };

  const removePanelMember = (member: string) => {
    setScheduleForm((prev) => ({
      ...prev,
      panel: prev.panel.filter((m) => m !== member),
    }));
  };

  const checkConflicts = () => {
    if (!scheduleForm.start_at || !scheduleForm.end_at) {
      return;
    }

    // Only check conflicts if we have real hearings data from the database
    if (hearings && hearings.length > 0) {
      const result = detectConflicts(
        {
          start_at: scheduleForm.start_at,
          end_at: scheduleForm.end_at,
          panel: scheduleForm.panel,
        },
        hearings
      );
      setConflicts(result.conflicts);
    } else {
      setConflicts([]);
    }
  };

  const handleScheduleHearing = async () => {
    if (!scheduleForm.case_id || !scheduleForm.type || !scheduleForm.venue || !scheduleForm.start_at || !scheduleForm.end_at) {
      toast.error('Please fill in all required fields');
      return;
    }

    const startDate = new Date(scheduleForm.start_at);
    const endDate = new Date(scheduleForm.end_at);

    if (endDate <= startDate) {
      toast.error('End time must be after start time');
      return;
    }

    checkConflicts();
    if (conflicts.length > 0 && hearings && hearings.length > 0) {
      toast.error('There are scheduling conflicts. Please resolve them first.');
      return;
    }

    try {
      if (hearings && hearings.length > 0) {
        await createHearing.mutateAsync(scheduleForm);
      }
      setIsScheduleOpen(false);
      setScheduleForm({
        case_id: '',
        type: '',
        venue: '',
        start_at: '',
        end_at: '',
        panel: [],
        agenda: '',
      });
      setConflicts([]);
      toast.success('Hearing scheduled successfully (demo mode)');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEventClick = (event: any) => {
    setSelectedHearing(event.resource);
    setIsDetailOpen(true);
  };

  const handleSlotSelect = (slotInfo: any) => {
    setScheduleForm((prev) => ({
      ...prev,
      start_at: slotInfo.start.toISOString().slice(0, 16),
      end_at: slotInfo.end.toISOString().slice(0, 16),
    }));
    setIsScheduleOpen(true);
  };

  const printSchedule = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hearing Calendar</h1>
          <p className="text-muted-foreground mt-1">View all scheduled hearings across all cases</p>
        </div>
      </div>

        {/* Main Content */}
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Calendar View</CardTitle>
                  <div className="flex gap-2">
                    <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                      <SelectTrigger className="w-[120px] bg-background z-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
                      <SelectTrigger className="w-[140px] bg-background z-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {monthOptions.map((month, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div style={{ height: '700px' }}>
                  <Calendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    view="month"
                    date={date}
                    onNavigate={setDate}
                    onSelectEvent={handleEventClick}
                    style={{ height: '100%' }}
                    views={['month']}
                    toolbar={false}
                    eventPropGetter={(event) => ({
                      style: {
                        backgroundColor: '#3b82f6',
                        borderRadius: '4px',
                        border: 'none',
                        color: 'white',
                      },
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Hearings</CardTitle>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case Number</TableHead>
                      <TableHead>Case Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Panel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayHearings.map((hearing) => (
                      <TableRow
                        key={hearing.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedHearing(hearing);
                          setIsDetailOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">
                          {hearing.legal_cases?.number || 'N/A'}
                        </TableCell>
                        <TableCell>{hearing.legal_cases?.title || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{hearing.type}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(hearing.start_at), 'PPp')}</TableCell>
                        <TableCell>{format(new Date(hearing.end_at), 'PPp')}</TableCell>
                        <TableCell>{hearing.venue}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {hearing.panel.slice(0, 2).map((member, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {member}
                              </Badge>
                            ))}
                            {hearing.panel.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{hearing.panel.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Schedule Hearing Dialog */}
        <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule Hearing</DialogTitle>
              <DialogDescription>Create a new hearing for a case</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Case Selection */}
              <div className="space-y-2">
                <Label htmlFor="case">Case *</Label>
                <Select
                  value={scheduleForm.case_id}
                  onValueChange={(v) => handleScheduleFormChange('case_id', v)}
                >
                  <SelectTrigger id="case" className="bg-popover">
                    <SelectValue placeholder="Select case" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {cases?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.number} - {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type and Venue */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Hearing Type *</Label>
                  <Select
                    value={scheduleForm.type}
                    onValueChange={(v) => handleScheduleFormChange('type', v)}
                  >
                    <SelectTrigger id="type" className="bg-popover">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {HEARING_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue *</Label>
                  <Select
                    value={scheduleForm.venue}
                    onValueChange={(v) => handleScheduleFormChange('venue', v)}
                  >
                    <SelectTrigger id="venue" className="bg-popover">
                      <SelectValue placeholder="Select venue" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {VENUES.map((venue) => (
                        <SelectItem key={venue} value={venue}>
                          {venue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Start and End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Start Time *</Label>
                  <Input
                    id="start"
                    type="datetime-local"
                    value={scheduleForm.start_at}
                    onChange={(e) => handleScheduleFormChange('start_at', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">End Time *</Label>
                  <Input
                    id="end"
                    type="datetime-local"
                    value={scheduleForm.end_at}
                    onChange={(e) => handleScheduleFormChange('end_at', e.target.value)}
                    onBlur={checkConflicts}
                  />
                </div>
              </div>

              {/* Panel Members */}
              <div className="space-y-2">
                <Label>Panel Members</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter panel member name"
                    value={newPanelMember}
                    onChange={(e) => setNewPanelMember(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addPanelMember()}
                  />
                  <Button type="button" onClick={addPanelMember} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {scheduleForm.panel.map((member, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-2">
                      {member}
                      <button
                        onClick={() => removePanelMember(member)}
                        className="text-xs hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Agenda */}
              <div className="space-y-2">
                <Label htmlFor="agenda">Agenda</Label>
                <Textarea
                  id="agenda"
                  value={scheduleForm.agenda}
                  onChange={(e) => handleScheduleFormChange('agenda', e.target.value)}
                  placeholder="Enter hearing agenda"
                  rows={3}
                />
              </div>

              {/* Conflicts Warning */}
              {conflicts.length > 0 && (
                <div className="bg-destructive/10 border border-destructive rounded-md p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-destructive mb-2">Scheduling Conflicts Detected</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {conflicts.map((conflict, idx) => (
                          <li key={idx}>{conflict}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleScheduleHearing} disabled={createHearing.isPending || conflicts.length > 0}>
                  {createHearing.isPending ? 'Scheduling...' : 'Schedule Hearing'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Hearing Detail Sheet */}
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
            {selectedHearing && (
              <>
                <SheetHeader>
                  <SheetTitle>Hearing Details</SheetTitle>
                  <SheetDescription>
                    {selectedHearing.legal_cases?.number} - {selectedHearing.legal_cases?.title}
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Type</h4>
                      <Badge variant="outline">{selectedHearing.type}</Badge>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Venue</h4>
                      <p className="text-sm">{selectedHearing.venue}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Start Time</h4>
                      <p className="text-sm">{format(new Date(selectedHearing.start_at), 'PPp')}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">End Time</h4>
                      <p className="text-sm">{format(new Date(selectedHearing.end_at), 'PPp')}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Panel Members</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedHearing.panel.map((member: string, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {member}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {selectedHearing.agenda && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Agenda</h4>
                      <p className="text-sm text-muted-foreground">{selectedHearing.agenda}</p>
                    </div>
                  )}

                  {selectedHearing.outcome && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Outcome</h4>
                      <p className="text-sm text-muted-foreground">{selectedHearing.outcome}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/legal/cases/${selectedHearing.case_id}`)}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Open Case
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Minutes
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
    </div>
  );
}
