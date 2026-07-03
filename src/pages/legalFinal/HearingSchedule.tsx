/** @deprecated Legal V1 prototype — routes redirect to canonical Legal V1 screens. Pending deletion one release cycle after 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Plus } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { LegalFinalService } from '@/services/legalFinalService';
import { CourtCase, HearingJudgment } from '@/types/legalFinal';

export const HearingSchedule = () => {
  const [cases, setCases] = useState<CourtCase[]>([]);
  const [hearings, setHearings] = useState<HearingJudgment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const casesData = await LegalFinalService.getCourtCases();
        setCases(casesData);
        
        // Get all hearings for all cases
        const allHearings = [];
        for (const courtCase of casesData) {
          const caseHearings = await LegalFinalService.getCaseHearings(courtCase.caseID);
          allHearings.push(...caseHearings.map(h => ({ ...h, caseDetails: courtCase })));
        }
        setHearings(allHearings);
      } catch (error) {
        console.error('Failed to load hearing data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get upcoming hearings from case data
  const upcomingHearings = cases
    .filter(c => c.nextHearingDate)
    .map(c => ({
      caseID: c.caseID,
      caseType: c.caseType,
      employerName: c.employerName,
      contributorName: c.contributorName,
      nextHearingDate: c.nextHearingDate!,
      officerAssigned: c.officerAssigned,
      courtReferenceNumber: c.courtReferenceNumber,
      caseStatus: c.caseStatus
    }))
    .sort((a, b) => new Date(a.nextHearingDate).getTime() - new Date(b.nextHearingDate).getTime());

  // Filter hearings for selected date
  const hearingsForSelectedDate = upcomingHearings.filter(h => 
    isSameDay(new Date(h.nextHearingDate), selectedDate)
  );

  // Get dates with hearings for calendar highlighting
  const datesWithHearings = upcomingHearings.map(h => new Date(h.nextHearingDate));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Hearing': return 'warning';
      case 'In Court': return 'info';
      case 'Filed': return 'default';
      default: return 'outline';
    }
  };

  const getTimeSlots = () => [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
    '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading hearing schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/legal-final')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Court Hearing Schedule</h1>
            <p className="text-muted-foreground">Manage and view all scheduled court hearings</p>
          </div>
        </div>
        <Button onClick={() => navigate('/legal-final/new-case')}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule New Hearing
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scheduled</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingHearings.length}</div>
            <p className="text-xs text-muted-foreground">Upcoming hearings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingHearings.filter(h => {
                const hearingDate = new Date(h.nextHearingDate);
                const today = new Date();
                const nextWeek = addDays(today, 7);
                return hearingDate >= today && hearingDate <= nextWeek;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingHearings.filter(h => 
                isSameDay(new Date(h.nextHearingDate), new Date())
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Hearings today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Date</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hearingsForSelectedDate.length}</div>
            <p className="text-xs text-muted-foreground">{format(selectedDate, 'MMM dd, yyyy')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
            <CardDescription>Select a date to view scheduled hearings</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              modifiers={{
                hasHearing: datesWithHearings
              }}
              modifiersStyles={{
                hasHearing: { 
                  backgroundColor: 'hsl(var(--primary))', 
                  color: 'white',
                  fontWeight: 'bold'
                }
              }}
              className="w-full pointer-events-auto"
            />
          </CardContent>
        </Card>

        {/* Selected Date Schedule */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Schedule for {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
              </CardTitle>
              <CardDescription>
                {hearingsForSelectedDate.length} hearing(s) scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hearingsForSelectedDate.length > 0 ? (
                <div className="space-y-4">
                  {getTimeSlots().map((timeSlot, index) => {
                    const hearing = hearingsForSelectedDate[index];
                    return (
                      <div key={timeSlot} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-20 text-sm font-medium text-muted-foreground">
                          {timeSlot}
                        </div>
                        {hearing ? (
                          <div className="flex-1 grid gap-2 md:grid-cols-3">
                            <div>
                              <p className="font-medium">{hearing.caseID}</p>
                              <p className="text-sm text-muted-foreground">
                                {hearing.employerName || hearing.contributorName}
                              </p>
                            </div>
                            <div>
                              <Badge variant="outline">{hearing.caseType}</Badge>
                              <p className="text-sm text-muted-foreground mt-1">
                                {hearing.courtReferenceNumber}
                              </p>
                            </div>
                            <div>
                              <Badge variant={getStatusColor(hearing.caseStatus) as any}>
                                {hearing.caseStatus}
                              </Badge>
                              <p className="text-sm text-muted-foreground mt-1">
                                Officer: {hearing.officerAssigned}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 text-sm text-muted-foreground italic">
                            Available
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hearings scheduled for this date</p>
                  <p className="text-sm text-muted-foreground">Select a different date or schedule a new hearing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming Hearings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Hearings</CardTitle>
          <CardDescription>
            All scheduled hearings in chronological order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingHearings.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Case ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Officer</TableHead>
                    <TableHead>Court Ref</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingHearings.map((hearing) => (
                    <TableRow key={hearing.caseID}>
                      <TableCell className="font-medium">
                        {format(new Date(hearing.nextHearingDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{hearing.caseID}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{hearing.caseType}</Badge>
                      </TableCell>
                      <TableCell>
                        {hearing.employerName || hearing.contributorName}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(hearing.caseStatus) as any}>
                          {hearing.caseStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{hearing.officerAssigned}</TableCell>
                      <TableCell>{hearing.courtReferenceNumber || 'Pending'}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/legal-final/cases/${hearing.caseID}/hearing`)}
                        >
                          Record Outcome
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No upcoming hearings scheduled</p>
              <p className="text-sm text-muted-foreground">Schedule hearings when creating or updating cases</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};