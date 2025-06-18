import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Employer } from '@/pages/EmployerDirectory';
import { 
  User, 
  MapPin, 
  Building, 
  Calendar, 
  Users, 
  FileText, 
  Gavel,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface EmployerDetailsDialogProps {
  employer: Employer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock data for lists
const mockOwners = [
  { id: 1, ownerId: 'OWN001', name: 'John Smith', title: 'CEO', phone: '(869) 465-1234' },
  { id: 2, ownerId: 'OWN002', name: 'Jane Doe', title: 'CFO', phone: '(869) 465-5678' }
];

const mockLocations = [
  { id: 1, address: '123 Main Street', city: 'Basseterre', state: 'St. Kitts', type: 'Main Office' },
  { id: 2, address: '456 Bay Road', city: 'Charlestown', state: 'Nevis', type: 'Branch Office' }
];

const mockCommenceDates = [
  { id: 1, type: 'Business Operations', dateCommenced: '2020-01-15', dateCeased: '' },
  { id: 2, type: 'Employment Registration', dateCommenced: '2020-02-01', dateCeased: '' }
];

const mockVisits = [
  { id: 1, visitDate: '2024-01-15', inspector: 'INS001', purpose: 'Compliance Check', status: 'Completed' },
  { id: 2, visitDate: '2023-06-20', inspector: 'INS002', purpose: 'Annual Audit', status: 'Completed' }
];

const mockSuits = [
  { id: 1, type: 'Civil', status: 'Active', amount: 50000, year: 2024, beginPeriod: '2024-01-01', endPeriod: '2024-12-31', schemeCode: 'SCH001' },
  { id: 2, type: 'Criminal', status: 'Resolved', amount: 25000, year: 2023, beginPeriod: '2023-01-01', endPeriod: '2023-12-31', schemeCode: 'SCH002' }
];

const mockNotes = [
  { id: 1, noteDate: '2024-01-15', note: 'Compliance review completed successfully', userId: 'USER001' },
  { id: 2, noteDate: '2023-12-10', note: 'Follow-up required for documentation', userId: 'USER002' }
];

export const EmployerDetailsDialog: React.FC<EmployerDetailsDialogProps> = ({
  employer,
  open,
  onOpenChange
}) => {
  if (!employer) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Employer Details - {employer.employerName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="owners">Owners</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="commence-dates">Commence Dates</TabsTrigger>
            <TabsTrigger value="visits">Visits</TabsTrigger>
            <TabsTrigger value="suits">Suits</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={employer.employerName} readOnly />
                  </div>
                  <div>
                    <Label>Trade Name</Label>
                    <Input value={employer.employerName} readOnly />
                  </div>
                  <div>
                    <Label>Reg. No.</Label>
                    <Input value={employer.registrationNumber} readOnly />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="pt-2">
                      <Badge variant={employer.employerStatus === 'Active' ? 'default' : 'destructive'}>
                        {employer.employerStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Address</Label>
                      <Input value={employer.address.street} readOnly />
                    </div>
                    <div>
                      <Label>Previous Owner</Label>
                      <Input value="" readOnly />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Contact Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label>Co. Tel #</Label>
                      <Input value={employer.contactInfo.phone} readOnly />
                    </div>
                    <div>
                      <Label>Co. Fax #</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>Parent Regno</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>Inspector Code</Label>
                      <Input value="" readOnly />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Transaction Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label>Date Of Entry</Label>
                      <Input value={formatDate(employer.registrationDate)} readOnly />
                    </div>
                    <div>
                      <Label>Ownership Code</Label>
                      <Input value="Partnership" readOnly />
                    </div>
                    <div>
                      <Label>Females Employed</Label>
                      <Input value="0" readOnly />
                    </div>
                    <div>
                      <Label>Males</Label>
                      <Input value={employer.numberOfEmployees.toString()} readOnly />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Registration Date</Label>
                    <Input value={formatDate(employer.registrationDate)} readOnly />
                  </div>
                  <div>
                    <Label>Social Code</Label>
                    <Input value="Private" readOnly />
                  </div>
                  <div>
                    <Label>Date Wages First Paid</Label>
                    <Input value="" readOnly />
                  </div>
                  <div>
                    <Label>Date of Closure</Label>
                    <Input value="" readOnly />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Entered By</Label>
                    <Input value="UN" readOnly />
                  </div>
                  <div>
                    <Label>Industrial Code</Label>
                    <Input value={employer.industryCode} readOnly />
                  </div>
                  <div>
                    <Label>Acquired Code</Label>
                    <Input value="N" readOnly />
                  </div>
                  <div>
                    <Label>Re-Registration Date</Label>
                    <Input value="" readOnly />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Date modified</Label>
                    <Input value={formatDate(employer.lastAuditDate)} readOnly />
                  </div>
                  <div>
                    <Label>Acquisition Date</Label>
                    <Input value="" readOnly />
                  </div>
                  <div>
                    <Label>Computer Payroll</Label>
                    <Input value="N" readOnly />
                  </div>
                  <div></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>User Id</Label>
                    <Input value="JEM" readOnly />
                  </div>
                  <div>
                    <Label>Incorporated Date</Label>
                    <Input value="" readOnly />
                  </div>
                  <div>
                    <Label>Make Model</Label>
                    <Input value="" readOnly />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Village</Label>
                    <Input value="Basseterre" readOnly />
                  </div>
                  <div>
                    <Label>Activity Type</Label>
                    <Input value="Domestic" readOnly />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="owners" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Owners Information
                  </div>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Owner
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Owner ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockOwners.map((owner) => (
                      <TableRow key={owner.id}>
                        <TableCell>{owner.ownerId}</TableCell>
                        <TableCell>{owner.name}</TableCell>
                        <TableCell>{owner.title}</TableCell>
                        <TableCell>{owner.phone}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Locations
                  </div>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Location
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Address</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockLocations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell>{location.address}</TableCell>
                        <TableCell>{location.city}</TableCell>
                        <TableCell>{location.state}</TableCell>
                        <TableCell>{location.type}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commence-dates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Commence Dates
                  </div>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Date
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date Commenced</TableHead>
                      <TableHead>Date Ceased</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockCommenceDates.map((date) => (
                      <TableRow key={date.id}>
                        <TableCell>{date.type}</TableCell>
                        <TableCell>{formatDate(date.dateCommenced)}</TableCell>
                        <TableCell>{date.dateCeased ? formatDate(date.dateCeased) : 'Active'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Visits
                  </div>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Visit
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visit Date</TableHead>
                      <TableHead>Inspector</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockVisits.map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell>{formatDate(visit.visitDate)}</TableCell>
                        <TableCell>{visit.inspector}</TableCell>
                        <TableCell>{visit.purpose}</TableCell>
                        <TableCell>
                          <Badge variant={visit.status === 'Completed' ? 'default' : 'outline'}>
                            {visit.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gavel className="h-5 w-5" />
                    Legal Suits
                  </div>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Suit
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Begin Period</TableHead>
                      <TableHead>End Period</TableHead>
                      <TableHead>Scheme Code</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockSuits.map((suit) => (
                      <TableRow key={suit.id}>
                        <TableCell>{suit.type}</TableCell>
                        <TableCell>
                          <Badge variant={suit.status === 'Active' ? 'destructive' : 'default'}>
                            {suit.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(suit.amount)}</TableCell>
                        <TableCell>{suit.year}</TableCell>
                        <TableCell>{formatDate(suit.beginPeriod)}</TableCell>
                        <TableCell>{formatDate(suit.endPeriod)}</TableCell>
                        <TableCell>{suit.schemeCode}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Notes
                  </div>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Note
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Note Date</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockNotes.map((note) => (
                      <TableRow key={note.id}>
                        <TableCell>{formatDate(note.noteDate)}</TableCell>
                        <TableCell>{note.note}</TableCell>
                        <TableCell>{note.userId}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
      </DialogContent>
    </Dialog>
  );
};
