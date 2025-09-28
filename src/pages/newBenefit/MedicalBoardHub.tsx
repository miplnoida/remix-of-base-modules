import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Stethoscope, 
  Calendar as CalendarIcon, 
  FileText, 
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit,
  Eye,
  UserPlus
} from 'lucide-react';

// Mock medical board data
const mockMedicalReferrals = [
  {
    id: 'MED001',
    claimId: 'CLM003',
    contributorName: 'Robert Johnson',
    benefitType: 'EMPLOYMENT_INJURY',
    referralDate: '2024-01-15',
    appointmentDate: '2024-01-25',
    status: 'SCHEDULED',
    boardMembers: ['Dr. Smith', 'Dr. Williams', 'Dr. Brown'],
    condition: 'Lower back injury from lifting incident'
  },
  {
    id: 'MED002',
    claimId: 'CLM005',
    contributorName: 'David Wilson',
    benefitType: 'INVALIDITY',
    referralDate: '2024-01-10',
    appointmentDate: '2024-01-20',
    status: 'COMPLETED',
    boardMembers: ['Dr. Smith', 'Dr. Johnson'],
    condition: 'Progressive neurological disorder',
    decision: 'Permanent disability - 75% incapacity',
    impairmentPercentage: 75
  },
  {
    id: 'MED003',
    claimId: 'CLM007',
    contributorName: 'Sarah Martinez',
    benefitType: 'INVALIDITY',
    referralDate: '2024-01-18',
    appointmentDate: null,
    status: 'PENDING_SCHEDULE',
    boardMembers: [],
    condition: 'Chronic heart condition'
  }
];

const mockBoardMembers = [
  { id: 'DR001', name: 'Dr. James Smith', specialty: 'Orthopedics', available: true },
  { id: 'DR002', name: 'Dr. Mary Williams', specialty: 'Neurology', available: true },
  { id: 'DR003', name: 'Dr. Robert Brown', specialty: 'General Medicine', available: false },
  { id: 'DR004', name: 'Dr. Linda Johnson', specialty: 'Cardiology', available: true }
];

export const MedicalBoardHub: React.FC = () => {
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [decision, setDecision] = useState('');
  const [impairmentPercentage, setImpairmentPercentage] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  const handleScheduleAppointment = () => {
    if (!appointmentDate || selectedMembers.length === 0) {
      alert('Please select an appointment date and at least one board member');
      return;
    }
    console.log('Scheduling appointment...', { appointmentDate, selectedMembers, medicalNotes });
    alert('Appointment scheduled successfully!');
    // Reset form
    setAppointmentDate(undefined);
    setSelectedMembers([]);
    setMedicalNotes('');
  };

  const handleRecordDecision = () => {
    if (!decision) {
      alert('Please select a medical board decision');
      return;
    }
    console.log('Recording medical board decision...', {
      decision,
      impairmentPercentage,
      medicalNotes
    });
    alert('Medical board decision recorded successfully!');
    // Reset form
    setDecision('');
    setImpairmentPercentage('');
    setMedicalNotes('');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'SCHEDULED':
        return 'secondary';
      case 'PENDING_SCHEDULE':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medical Board Hub</h1>
          <p className="text-muted-foreground">Manage medical board referrals, appointments, and decisions</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Referral
        </Button>
      </div>

      <Tabs defaultValue="referrals" className="w-full">
        <TabsList>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="appointments">Appointment Scheduling</TabsTrigger>
          <TabsTrigger value="decisions">Record Decisions</TabsTrigger>
          <TabsTrigger value="reviews">Medical Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medical Board Referrals</CardTitle>
              <CardDescription>Cases referred for medical board evaluation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockMedicalReferrals.map((referral) => (
                  <div 
                    key={referral.id}
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedReferral?.id === referral.id ? 'bg-muted border-primary' : ''
                    }`}
                    onClick={() => setSelectedReferral(referral)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Stethoscope className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">{referral.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            {referral.contributorName} - {referral.benefitType.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Condition: {referral.condition}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusBadgeVariant(referral.status)}>
                          {referral.status.replace(/_/g, ' ')}
                        </Badge>
                        {referral.appointmentDate && (
                          <Badge variant="outline" className="text-xs">
                            {new Date(referral.appointmentDate).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {referral.decision && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-900">Decision: {referral.decision}</p>
                        {referral.impairmentPercentage && (
                          <p className="text-xs text-green-700">
                            Impairment: {referral.impairmentPercentage}%
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedReferral && (
            <Card>
              <CardHeader>
                <CardTitle>Referral Details - {selectedReferral.id}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Contributor</Label>
                      <p className="text-sm">{selectedReferral.contributorName}</p>
                    </div>
                    <div>
                      <Label>Claim ID</Label>
                      <p className="text-sm">{selectedReferral.claimId}</p>
                    </div>
                    <div>
                      <Label>Benefit Type</Label>
                      <p className="text-sm">{selectedReferral.benefitType.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <Label>Medical Condition</Label>
                      <p className="text-sm">{selectedReferral.condition}</p>
                    </div>
                    <div>
                      <Label>Referral Date</Label>
                      <p className="text-sm">{new Date(selectedReferral.referralDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button className="w-full">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Schedule Appointment
                    </Button>
                    <Button variant="outline" className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      View Medical Records
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View Claim
                    </Button>
                    {selectedReferral.status === 'COMPLETED' && (
                      <Button variant="outline" className="w-full">
                        <Edit className="h-4 w-4 mr-2" />
                        Update Decision
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Medical Board Appointment</CardTitle>
              <CardDescription>Set up appointments for medical evaluations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Referral ID</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select referral" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockMedicalReferrals
                        .filter(ref => ref.status === 'PENDING_SCHEDULE')
                        .map(ref => (
                          <SelectItem key={ref.id} value={ref.id}>
                            {ref.id} - {ref.contributorName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Appointment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {appointmentDate ? appointmentDate.toDateString() : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={appointmentDate}
                        onSelect={setAppointmentDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label>Board Members</Label>
                <div className="mt-2 space-y-2">
                  {mockBoardMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers([...selectedMembers, member.id]);
                            } else {
                              setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                            }
                          }}
                          disabled={!member.available}
                        />
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.specialty}</p>
                        </div>
                      </div>
                      <Badge variant={member.available ? "default" : "secondary"}>
                        {member.available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="medicalNotes">Appointment Notes</Label>
                <Textarea 
                  id="medicalNotes"
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="Any special instructions for the medical board..."
                />
              </div>

              <Button onClick={handleScheduleAppointment} className="w-full">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Schedule Appointment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Record Medical Board Decision</CardTitle>
              <CardDescription>Document the outcome of medical board evaluations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Appointment</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select completed appointment" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockMedicalReferrals
                      .filter(ref => ref.status === 'SCHEDULED')
                      .map(ref => (
                        <SelectItem key={ref.id} value={ref.id}>
                          {ref.id} - {ref.contributorName} - {ref.appointmentDate}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="decision">Medical Board Decision</Label>
                <Select value={decision} onValueChange={setDecision}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit_for_work">Fit for Work</SelectItem>
                    <SelectItem value="temporary_disability">Temporary Disability</SelectItem>
                    <SelectItem value="permanent_partial">Permanent Partial Disability</SelectItem>
                    <SelectItem value="permanent_total">Permanent Total Disability</SelectItem>
                    <SelectItem value="needs_further_assessment">Needs Further Assessment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="impairmentPercentage">Impairment Percentage (if applicable)</Label>
                <Input 
                  id="impairmentPercentage"
                  type="number"
                  value={impairmentPercentage}
                  onChange={(e) => setImpairmentPercentage(e.target.value)}
                  placeholder="Enter percentage (0-100)"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <Label htmlFor="medicalNotes">Medical Board Notes</Label>
                <Textarea 
                  id="medicalNotes"
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="Detailed notes from the medical board evaluation..."
                  rows={4}
                />
              </div>

              <Button onClick={handleRecordDecision} className="w-full">
                <CheckCircle className="h-4 w-4 mr-2" />
                Record Decision
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medical Reviews</CardTitle>
              <CardDescription>Ongoing medical reviews and re-assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">Annual Invalidity Review - David Wilson</p>
                      <p className="text-sm text-muted-foreground">Due: March 15, 2024</p>
                    </div>
                  </div>
                  <Button size="sm">
                    Schedule Review
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-medium">6-Month Injury Progress Review - Robert Johnson</p>
                      <p className="text-sm text-muted-foreground">Due: February 1, 2024</p>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary">
                    Overdue
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Return to Work Assessment - Maria Garcia</p>
                      <p className="text-sm text-muted-foreground">Completed: January 10, 2024</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    View Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};