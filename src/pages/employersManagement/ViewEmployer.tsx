import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Stepper, StepperStep } from '@/components/ui/stepper';
import { ArrowLeft, Building2, Users, Phone, Settings, FileText, Printer, Edit, CalendarIcon, User } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import { Label } from '@/components/ui/label';

const sampleEmployerData = {
  regNo: "EMP001",
  name: "ABC Construction Ltd",
  tradeName: "ABC Construction",
  addressType: "mailing",
  mailingAddress: "123 Main Street, Basseterre",
  mailingPostalCode: "KN001",
  hqAddress: "456 Industrial Road, Cayon",
  hqPostalCode: "KN002",
  telephone: "(869) 465-2345",
  fax: "(869) 465-2346",
  email: "info@abcconstruction.com",
  parentRegNo: "PARENT001",
  officeCode: "BST001",
  ownershipCode: "OWN001",
  sectorCode: "SEC001",
  industrialCode: "Building of Complete Con",
  village: "Basseterre",
  activityType: "Construction",
  inspectorCode: "INS001",
  totalEmployees: 45,
  maleEmployees: 32,
  femaleEmployees: 13,
  applicationDate: "2024-01-15",
  dateWagesFirstPaid: "2024-02-01",
  dateOfClosure: null as string | null,
  reregistrationDate: null as string | null,
  computerPayroll: true,
  makeModel: "QuickBooks Enterprise",
  acquiredCompany: false,
  acquisitionDate: null as string | null,
  incorporatedDate: "2020-05-20",
  acquiredCode: "new",
  previousOwners: [
    { name: "John Smith", address: "456 Heritage Lane, Basseterre" }
  ],
  dateOfEntry: "2024-01-15",
  registrationDate: "2024-01-20",
  enteredBy: "admin",
  dateModified: "2024-06-15",
  userId: "USR001"
};

const steps: StepperStep[] = [
  { id: 'general', title: 'General Info', icon: undefined, status: 'current' },
  { id: 'background', title: 'Background Info', icon: undefined, status: 'upcoming' },
  { id: 'contact', title: 'Contact & Reach', icon: undefined, status: 'upcoming' },
  { id: 'tech', title: 'Tech & Finance Overview', icon: undefined, status: 'upcoming' },
];

const owners = [
  { id: "OWN-001", name: "John Smith", title: "Director", phoneNumber: "(869) 465-1234" },
  { id: "OWN-002", name: "Jane Doe", title: "Managing Director", phoneNumber: "(869) 465-5678" },
];

const locations = [
  { id: "LOC-001", tradeName: "ABC Construction HQ", locAddr1: "456 Industrial Road", locAddr2: "Cayon", activityType: "Main Office" },
  { id: "LOC-002", tradeName: "ABC Construction Site A", locAddr1: "789 Building Lane", locAddr2: "Basseterre", activityType: "Construction Site" },
];

const notes = [
  { id: "NOTE-001", noteDate: new Date("2024-06-15"), note: "Annual inspection completed. All records in order.", userId: "USR001" },
  { id: "NOTE-002", noteDate: new Date("2024-03-20"), note: "Updated mailing address per employer request.", userId: "USR002" },
];

export function ViewEmployer() {
  const navigate = useNavigate();
  const { regNo } = useParams();
  const [activeTab, setActiveTab] = useState("form-detail");
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Not specified";
    try {
      return format(new Date(date), "MM/dd/yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const formatBoolean = (value: boolean) => {
    return value ? "Yes" : "No";
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // General Info
        return (
          <div className="space-y-6">
            {/* General Information */}
            <div>
              <CardHeader>
                <CardTitle>General Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Name *</Label>
                    <p className="text-sm font-medium">{sampleEmployerData.name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Trade Name</Label>
                    <p className="text-sm">{sampleEmployerData.tradeName}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">E-Mail Address</Label>
                    <p className="text-sm">{sampleEmployerData.email}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">HQ Address *</Label>
                    <p className="text-sm">{sampleEmployerData.hqAddress}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Mailing Address *</Label>
                    <p className="text-sm">{sampleEmployerData.mailingAddress}</p>
                  </div>
                </div>
              </CardContent>
            </div>

            {/* Previous Owner Information */}
            <div>
              <CardHeader>
                <CardTitle>Previous Owner Information</CardTitle>
              </CardHeader>
              <CardContent>
                {sampleEmployerData.previousOwners.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sampleEmployerData.previousOwners.map((owner, index) => (
                      <div key={index} className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Name *</Label>
                        <p className="text-sm">{owner.name}</p>
                      </div>
                    ))}
                    {sampleEmployerData.previousOwners.map((owner, index) => (
                      <div key={`address-${index}`} className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                        <p className="text-sm">{owner.address}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No previous owner information recorded.</p>
                )}
              </CardContent>
            </div>

            {/* Organizational Information */}
            <div>
              <CardHeader>
                <CardTitle>Organizational Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Parent Reg. No.</Label>
                    <p className="text-sm">{sampleEmployerData.parentRegNo || "Not specified"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Office Code</Label>
                    <p className="text-sm">{sampleEmployerData.officeCode}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Ownership Code</Label>
                    <p className="text-sm">{sampleEmployerData.ownershipCode}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Sector Code</Label>
                    <p className="text-sm">{sampleEmployerData.sectorCode}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Industrial Code</Label>
                    <p className="text-sm">{sampleEmployerData.industrialCode}</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </div>
        );

      case 1: // Background Info
        return (
          <div className="space-y-6">
            {/* Previous Owners */}
            <div>
              <CardHeader>
                <CardTitle>Previous Owners</CardTitle>
              </CardHeader>
              <CardContent>
                {sampleEmployerData.previousOwners.length > 0 ? (
                  <div className="space-y-4">
                    {sampleEmployerData.previousOwners.map((owner, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground">Previous Owner Name</Label>
                          <p className="text-sm">{owner.name}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground">Previous Owner Address</Label>
                          <p className="text-sm">{owner.address}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No previous owners recorded.</p>
                )}
              </CardContent>
            </div>

            {/* Acquisition / Incorporation */}
            <div>
              <CardHeader>
                <CardTitle>Acquisition / Incorporation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Acquired Company</Label>
                    <p className="text-sm">{formatBoolean(sampleEmployerData.acquiredCompany)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Acquisition Date</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.acquisitionDate)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Incorporated Date</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.incorporatedDate)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Acquired Code</Label>
                    <p className="text-sm capitalize">{sampleEmployerData.acquiredCode || "Not specified"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Activity Type</Label>
                    <p className="text-sm">{sampleEmployerData.activityType || "Not specified"}</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </div>
        );

      case 2: // Contact & Reach
        return (
          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Contact Telephone No. *</Label>
                    <p className="text-sm font-medium">{sampleEmployerData.telephone}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Contact Fax No.</Label>
                    <p className="text-sm">{sampleEmployerData.fax}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Email *</Label>
                    <p className="text-sm font-medium">{sampleEmployerData.email}</p>
                  </div>
                </div>
              </CardContent>
            </div>

            {/* Location Information */}
            <div>
              <CardHeader>
                <CardTitle>Location Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Village</Label>
                    <p className="text-sm">{sampleEmployerData.village}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Activity Type</Label>
                    <p className="text-sm">{sampleEmployerData.activityType}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Inspector Code</Label>
                    <p className="text-sm">{sampleEmployerData.inspectorCode}</p>
                  </div>
                </div>
              </CardContent>
            </div>

            {/* Dates & Employees */}
            <div>
              <CardHeader>
                <CardTitle>Dates & Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Date of Application</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.applicationDate)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Total Employees</Label>
                    <p className="text-sm">{sampleEmployerData.totalEmployees}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Male Employees</Label>
                    <p className="text-sm">{sampleEmployerData.maleEmployees}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Female Employees</Label>
                    <p className="text-sm">{sampleEmployerData.femaleEmployees}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Date Wages First Paid</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.dateWagesFirstPaid)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Date of Closure</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.dateOfClosure)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Re-registration Date</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.reregistrationDate)}</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </div>
        );

      case 3: // Tech & Finance Overview
        return (
          <div className="space-y-6">
            {/* Technical Information */}
            <div>
              <CardHeader>
                <CardTitle>Technical Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Computer Payroll</Label>
                    <p className="text-sm">{formatBoolean(sampleEmployerData.computerPayroll)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Make Model</Label>
                    <p className="text-sm">{sampleEmployerData.makeModel}</p>
                  </div>
                </div>
              </CardContent>
            </div>

            {/* Transaction Details */}
            <div>
              <CardHeader>
                <CardTitle>Transaction Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Date of Entry</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.dateOfEntry)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Registration Date</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.registrationDate)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Entered By</Label>
                    <p className="text-sm">{sampleEmployerData.enteredBy}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Date Modified</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.dateModified)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">User ID</Label>
                    <p className="text-sm">{sampleEmployerData.userId}</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/employers-management/dashboard')}
            className="flex items-center gap-2 border-0 border-l-2 border-l-primary shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="h-6 w-px bg-border" />
          
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">View {sampleEmployerData.name}</h1>
            
          </div>
        </div>
        <div className="flex gap-2 self-start lg:self-center mt-4 lg:mt-0">
          <Button variant="outline" onClick={() => console.log('Change Status clicked')}>
            <Settings className="h-4 w-4 mr-2" />
            Change Status
          </Button>
          <Button variant="outline" onClick={() => console.log('Registration Certificate clicked')}>
            <FileText className="h-4 w-4 mr-2" />
            Registration Certificate
          </Button>
          <Button variant="outline" onClick={() => console.log('Print clicked')}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={() => navigate(`/employers-management/edit/${regNo}`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Employer
          </Button>
        </div>
      </div>
      <Card className="mb-4">
        <CardContent className="py-4 px-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <User className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            </div>
            <div className="flex flex-col gap-1 justify-center">
              <h1 className="text-xl lg:text-2xl font-bold text-foreground leading-tight">
              {sampleEmployerData.name}
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-sm font-medium">Regn No.: {sampleEmployerData.regNo}</span>
                
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="form-detail">Form Detail</TabsTrigger>
              <TabsTrigger value="owners">Owners</TabsTrigger>
              <TabsTrigger value="locations">Locations</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="commence-date">Commence Date</TabsTrigger>
              <TabsTrigger value="visits">Visits</TabsTrigger>
              <TabsTrigger value="suits">Suits</TabsTrigger>
            </TabsList>

            <TabsContent value="form-detail" className="space-y-6">
              {/* Stepper */}
              <Card className='py-5 mt-5 bg-muted'>
                <div className='px-5 mb-6'>
                  <Card className='p-3'>
                    <Stepper 
                      steps={steps} 
                      currentStep={currentStep} 
                      onStepClick={goToStep}
                      className=""
                    />
                  </Card>
                </div>

                {/* Step Content */}
                <div className="px-5">
                  {renderStepContent()}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-6 px-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="flex items-center gap-2 border-0 border-l-2 border-l-primary shadow-md bg-primary/10"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex gap-3">
                    {currentStep < steps.length - 1 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="flex items-center gap-2 border-r-4 border-r-primary"
                      >
                        Next
                        <ArrowLeft className="h-4 w-4 rotate-180" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <CalendarIcon className="h-4 w-4" />
                        View History
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="owners" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Owners</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Owner ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Phone Number</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {owners.length > 0 ? (
                        owners.map((owner) => (
                          <TableRow key={owner.id}>
                            <TableCell>{owner.id}</TableCell>
                            <TableCell>{owner.name}</TableCell>
                            <TableCell>{owner.title}</TableCell>
                            <TableCell>{owner.phoneNumber}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No owners recorded for this employer.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="locations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Locations</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location ID</TableHead>
                        <TableHead>Trade Name</TableHead>
                        <TableHead>Loc Addr1</TableHead>
                        <TableHead>Loc Addr2</TableHead>
                        <TableHead>Activity Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.length > 0 ? (
                        locations.map((location) => (
                          <TableRow key={location.id}>
                            <TableCell>{location.id}</TableCell>
                            <TableCell>{location.tradeName}</TableCell>
                            <TableCell>{location.locAddr1}</TableCell>
                            <TableCell>{location.locAddr2}</TableCell>
                            <TableCell>{location.activityType}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No locations recorded for this employer.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Notes ID</TableHead>
                        <TableHead>Note Date</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>User's ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notes.length > 0 ? (
                        notes.map((note) => (
                          <TableRow key={note.id}>
                            <TableCell>{note.id}</TableCell>
                            <TableCell>{format(note.noteDate, "MM/dd/yyyy")}</TableCell>
                            <TableCell>{note.note}</TableCell>
                            <TableCell>{note.userId}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No notes recorded for this employer.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commence-date" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Commence Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-12">
                    <p>Commence Date functionality will be implemented here.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visits" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Visits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-12">
                    <p>Visits functionality will be implemented here.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suits" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Suits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-12">
                    <p>Suits functionality will be implemented here.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
