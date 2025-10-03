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

export default function LegalHearingCalendar() {
  const navigate = useNavigate();
  const { signOut } = useLegalAuth();
  const { data: hearings, isLoading } = useLegalHearings();
  const { data: cases } = useLegalCases();
  const createHearing = useCreateHearing();
  const updateHearing = useUpdateHearing();

  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  const [selectedHearing, setSelectedHearing] = useState<any>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
    if (!hearings) return [];
    return hearings.map((hearing) => ({
      id: hearing.id,
      title: `${hearing.legal_cases?.number || 'Unknown'} - ${hearing.type}`,
      start: new Date(hearing.start_at),
      end: new Date(hearing.end_at),
      resource: hearing,
    }));
  }, [hearings]);

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
    if (!scheduleForm.start_at || !scheduleForm.end_at || !hearings) {
      return;
    }

    const result = detectConflicts(
      {
        start_at: scheduleForm.start_at,
        end_at: scheduleForm.end_at,
        panel: scheduleForm.panel,
      },
      hearings
    );

    setConflicts(result.conflicts);
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
    if (conflicts.length > 0) {
      toast.error('There are scheduling conflicts. Please resolve them first.');
      return;
    }

    try {
      await createHearing.mutateAsync(scheduleForm);
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/legal/cases')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Cases
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
              <Home className="h-4 w-4" />
              Main Menu
            </Button>
            <h1 className="text-3xl font-bold">Hearing Calendar</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsScheduleOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Schedule Hearing
            </Button>
            <Button variant="outline" onClick={printSchedule} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
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
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="text-center py-12">Loading hearings...</div>
                ) : (
                  <div style={{ height: '700px' }}>
                    <Calendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      view={view}
                      onView={setView}
                      date={date}
                      onNavigate={setDate}
                      onSelectEvent={handleEventClick}
                      onSelectSlot={handleSlotSelect}
                      selectable
                      style={{ height: '100%' }}
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
                )}
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
                {isLoading ? (
                  <div className="text-center py-8">Loading hearings...</div>
                ) : hearings && hearings.length > 0 ? (
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
                      {hearings.map((hearing) => (
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
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">No hearings scheduled</p>
                    <Button onClick={() => setIsScheduleOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule First Hearing
                    </Button>
                  </div>
                )}
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
    </div>
  );
}
