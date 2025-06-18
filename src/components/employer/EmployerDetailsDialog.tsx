
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Employer } from '@/pages/EmployerDirectory';
import { 
  User, 
  MapPin, 
  Building, 
  Calendar, 
  Users, 
  FileText, 
  Gavel 
} from 'lucide-react';

interface EmployerDetailsDialogProps {
  employer: Employer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Owners Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                      <Label>Owner Id</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>Name</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value="" readOnly />
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 text-center py-8">
                    No owner information available
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500 text-center py-8">
                  No additional locations recorded
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commence-dates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Commence Dates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Date Commenced</Label>
                      <Input value={formatDate(employer.registrationDate)} readOnly />
                    </div>
                    <div>
                      <Label>Date Ceased</Label>
                      <Input value="" readOnly />
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 text-center py-8">
                    Additional commence date information not available
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Visits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500 text-center py-8">
                  No visit records available
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5" />
                  Suits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>Year</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>Begin period</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>End period</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>Scheme Code</Label>
                      <Input value="" readOnly />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label>Date Of Filing</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>Number</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>Date Of Hearing</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>Awarded Amount</Label>
                      <Input value="" readOnly />
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 text-center py-8">
                    No legal suits recorded
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Note Date</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>Note</Label>
                      <Input value="" readOnly />
                    </div>
                    <div>
                      <Label>User Id</Label>
                      <Input value="" readOnly />
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 text-center py-8">
                    No notes available
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
