import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Employer } from '@/pages/employersManagement/EmployerDirectory';
import { formatDisplayDate } from '@/lib/dateFormat';
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
    return formatDisplayDate(dateString);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Building className="h-5 w-5 text-primary" />
            Employer Details - {employer.employerName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-7 bg-muted">
            <TabsTrigger value="basic" className="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Basic</TabsTrigger>
            <TabsTrigger value="owners" className="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Owners</TabsTrigger>
            <TabsTrigger value="locations" className="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Locations</TabsTrigger>
            <TabsTrigger value="commence-dates" className="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Commence Dates</TabsTrigger>
            <TabsTrigger value="visits" className="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Visits</TabsTrigger>
            <TabsTrigger value="suits" className="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Suits</TabsTrigger>
            <TabsTrigger value="notes" className="text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="bg-muted">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <User className="h-5 w-5 text-primary" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 bg-card">
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
            <Card className="border-border">
              <CardHeader className="bg-muted">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground">
                    <Users className="h-5 w-5 text-primary" />
                    Owners Information
                  </div>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Owner
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-card">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="text-foreground font-semibold">Actions</TableHead>
                        <TableHead className="text-foreground font-semibold">Owner ID</TableHead>
                        <TableHead className="text-foreground font-semibold">Name</TableHead>
                        <TableHead className="text-foreground font-semibold">Title</TableHead>
                        <TableHead className="text-foreground font-semibold">Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockOwners.map((owner) => (
                        <TableRow key={owner.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/5">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{owner.ownerId}</TableCell>
                          <TableCell className="text-foreground font-medium">{owner.name}</TableCell>
                          <TableCell className="text-muted-foreground">{owner.title}</TableCell>
                          <TableCell className="text-muted-foreground">{owner.phone}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="bg-muted">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground">
                    <MapPin className="h-5 w-5 text-primary" />
                    Locations
                  </div>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Location
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-card">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="text-foreground font-semibold">Actions</TableHead>
                        <TableHead className="text-foreground font-semibold">Address</TableHead>
                        <TableHead className="text-foreground font-semibold">City</TableHead>
                        <TableHead className="text-foreground font-semibold">State</TableHead>
                        <TableHead className="text-foreground font-semibold">Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockLocations.map((location) => (
                        <TableRow key={location.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/5">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{location.address}</TableCell>
                          <TableCell className="text-muted-foreground">{location.city}</TableCell>
                          <TableCell className="text-muted-foreground">{location.state}</TableCell>
                          <TableCell className="text-muted-foreground">{location.type}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commence-dates" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="bg-muted">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground">
                    <Calendar className="h-5 w-5 text-primary" />
                    Commence Dates
                  </div>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Date
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-card">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="text-foreground font-semibold">Actions</TableHead>
                        <TableHead className="text-foreground font-semibold">Type</TableHead>
                        <TableHead className="text-foreground font-semibold">Date Commenced</TableHead>
                        <TableHead className="text-foreground font-semibold">Date Ceased</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockCommenceDates.map((date) => (
                        <TableRow key={date.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/5">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{date.type}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(date.dateCommenced)}</TableCell>
                          <TableCell className="text-muted-foreground">{date.dateCeased ? formatDate(date.dateCeased) : 'Active'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visits" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="bg-muted">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground">
                    <Calendar className="h-5 w-5 text-primary" />
                    Visits
                  </div>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Visit
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-card">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="text-foreground font-semibold">Actions</TableHead>
                        <TableHead className="text-foreground font-semibold">Visit Date</TableHead>
                        <TableHead className="text-foreground font-semibold">Inspector</TableHead>
                        <TableHead className="text-foreground font-semibold">Purpose</TableHead>
                        <TableHead className="text-foreground font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockVisits.map((visit) => (
                        <TableRow key={visit.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/5">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(visit.visitDate)}</TableCell>
                          <TableCell className="text-muted-foreground">{visit.inspector}</TableCell>
                          <TableCell className="text-muted-foreground">{visit.purpose}</TableCell>
                          <TableCell>
                            <Badge variant={visit.status === 'Completed' ? 'default' : 'outline'}>
                              {visit.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suits" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="bg-muted">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground">
                    <Gavel className="h-5 w-5 text-primary" />
                    Legal Suits
                  </div>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Suit
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-card">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="text-foreground font-semibold">Actions</TableHead>
                        <TableHead className="text-foreground font-semibold">Type</TableHead>
                        <TableHead className="text-foreground font-semibold">Status</TableHead>
                        <TableHead className="text-foreground font-semibold">Amount</TableHead>
                        <TableHead className="text-foreground font-semibold">Year</TableHead>
                        <TableHead className="text-foreground font-semibold">Begin Period</TableHead>
                        <TableHead className="text-foreground font-semibold">End Period</TableHead>
                        <TableHead className="text-foreground font-semibold">Scheme Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockSuits.map((suit) => (
                        <TableRow key={suit.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/5">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{suit.type}</TableCell>
                          <TableCell>
                            <Badge variant={suit.status === 'Active' ? 'destructive' : 'default'}>
                              {suit.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatCurrency(suit.amount)}</TableCell>
                          <TableCell className="text-muted-foreground">{suit.year}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(suit.beginPeriod)}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(suit.endPeriod)}</TableCell>
                          <TableCell className="text-muted-foreground">{suit.schemeCode}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="bg-muted">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground">
                    <FileText className="h-5 w-5 text-primary" />
                    Notes
                  </div>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Note
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-card">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="text-foreground font-semibold">Actions</TableHead>
                        <TableHead className="text-foreground font-semibold">Note Date</TableHead>
                        <TableHead className="text-foreground font-semibold">Note</TableHead>
                        <TableHead className="text-foreground font-semibold">User ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockNotes.map((note) => (
                        <TableRow key={note.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/5">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(note.noteDate)}</TableCell>
                          <TableCell className="text-muted-foreground">{note.note}</TableCell>
                          <TableCell className="text-muted-foreground">{note.userId}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
