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

// Sample employer data for view mode
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
  inspectorCode: "01 Vincent Sutton",
  acquiredCompany: true,
  acquisitionDate: new Date("2022-04-01"),
  incorporatedDate: new Date("2023-01-01"),
  acquiredCode: "yes",
  applicationDate: new Date("2023-01-01"),
  totalEmployees: "40",
  maleEmployees: "25",
  femaleEmployees: "15",
  dateWagesFirstPaid: new Date("2023-02-01"),
  dateOfClosure: null,
  reregistrationDate: null,
  computerPayroll: true,
  makeModel: "Dell Optiplex",
  dateOfEntry: new Date("2023-01-10"),
  registrationDate: new Date("2023-01-20"),
  enteredBy: "John Doe",
  dateModified: new Date("2024-01-01"),
  userId: "ADMIN001",
  previousOwners: [
    { name: "Previous Corp", address: "789 Old Street, Old Town" }
  ]
};

interface Owner {
  id: string;
  name: string;
  title: string;
  phoneNumber: string;
}

interface Location {
  id: string;
  tradeName: string;
  locAddr1: string;
  locAddr2: string;
  activityType: string;
}

interface Note {
  id: string;
  noteDate: Date;
  note: string;
  userId: string;
}

export const ViewEmployer = () => {
  const { regNo } = useParams();
  const [activeTab, setActiveTab] = useState("form-detail");
  const [currentStep, setCurrentStep] = useState(0);
  
  // Sample data for Owners
  const [owners] = useState<Owner[]>([
    {
      id: "OWN001",
      name: "John Smith",
      title: "Chief Executive Officer",
      phoneNumber: "(869) 465-1234"
    },
    {
      id: "OWN002", 
      name: "Sarah Johnson",
      title: "Chief Financial Officer",
      phoneNumber: "(869) 465-5678"
    },
    {
      id: "OWN003",
      name: "Michael Brown",
      title: "Chief Operations Officer", 
      phoneNumber: "(869) 465-9012"
    }
  ]);

  // Sample data for Locations
  const [locations] = useState<Location[]>([
    {
      id: "LOC001",
      tradeName: "ABC Construction - Main Office",
      locAddr1: "123 Main Street",
      locAddr2: "Basseterre, Saint Kitts",
      activityType: "Administrative"
    },
    {
      id: "LOC002",
      tradeName: "ABC Construction - Site A",
      locAddr1: "456 Industrial Road",
      locAddr2: "Cayon, Saint Kitts", 
      activityType: "Construction Site"
    },
    {
      id: "LOC003",
      tradeName: "ABC Construction - Warehouse",
      locAddr1: "789 Storage Lane",
      locAddr2: "Sandy Point, Saint Kitts",
      activityType: "Storage & Logistics"
    }
  ]);

  // Sample data for Notes
  const [notes] = useState<Note[]>([
    {
      id: "NOTE001",
      noteDate: new Date("2024-01-15"),
      note: "Initial registration completed. All documents verified and approved. Company is compliant with all regulatory requirements.",
      userId: "ADMIN001"
    },
    {
      id: "NOTE002", 
      noteDate: new Date("2024-02-20"),
      note: "Annual compliance review conducted. No issues found. Company continues to meet all employment and safety standards.",
      userId: "INSPECTOR001"
    },
    {
      id: "NOTE003",
      noteDate: new Date("2024-03-10"),
      note: "Updated employee count: 40 total employees (25 male, 15 female). All new employees properly registered in the system.",
      userId: "HR001"
    },
    {
      id: "NOTE004",
      noteDate: new Date("2024-04-05"),
      note: "Site inspection completed at all three locations. Safety protocols are being followed correctly. No violations found.",
      userId: "SAFETY001"
    }
  ]);

  const navigate = useNavigate();

  // Define stepper steps
  const steps: StepperStep[] = [
    {
      id: 'entity-overview',
      title: 'Entity Overview',
      icon: <Building2 className="w-5 h-5" />,
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'upcoming'
    },
    {
      id: 'background-info',
      title: 'Background Info',
      icon: <Users className="w-5 h-5" />,
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'upcoming'
    },
    {
      id: 'contact-reach',
      title: 'Contact & Reach',
      icon: <Phone className="w-5 h-5" />,
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'upcoming'
    },
    {
      id: 'tech-finance',
      title: 'Tech & Finance Overview',
      icon: <Settings className="w-5 h-5" />,
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'upcoming'
    }
  ];

  // Navigation functions
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

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  // Helper function to format dates
  const formatDate = (date: Date | null) => {
    if (!date) return "Not specified";
    return format(date, "MM/dd/yyyy");
  };

  // Helper function to format boolean values
  const formatBoolean = (value: boolean) => {
    return value ? "Yes" : "No";
  };

  // Step content components for view mode
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Entity Overview
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
                    <Label className="text-sm font-medium text-gray-500">Name *</Label>
                    <p className="text-sm font-medium">{sampleEmployerData.name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Trade Name</Label>
                    <p className="text-sm">{sampleEmployerData.tradeName}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">E-Mail Address</Label>
                    <p className="text-sm">{sampleEmployerData.email}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">HQ Address *</Label>
                    <p className="text-sm">{sampleEmployerData.hqAddress}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Mailing Address *</Label>
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
                        <Label className="text-sm font-medium text-gray-500">Name *</Label>
                        <p className="text-sm">{owner.name}</p>
                      </div>
                    ))}
                    {sampleEmployerData.previousOwners.map((owner, index) => (
                      <div key={`address-${index}`} className="space-y-2">
                        <Label className="text-sm font-medium text-gray-500">Address</Label>
                        <p className="text-sm">{owner.address}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No previous owner information recorded.</p>
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
                    <Label className="text-sm font-medium text-gray-500">Parent Reg. No.</Label>
                    <p className="text-sm">{sampleEmployerData.parentRegNo || "Not specified"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Office Code</Label>
                    <p className="text-sm">{sampleEmployerData.officeCode}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Ownership Code</Label>
                    <p className="text-sm">{sampleEmployerData.ownershipCode}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Sector Code</Label>
                    <p className="text-sm">{sampleEmployerData.sectorCode}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Industrial Code</Label>
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
                          <Label className="text-sm font-medium text-gray-500">Previous Owner Name</Label>
                          <p className="text-sm">{owner.name}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-500">Previous Owner Address</Label>
                          <p className="text-sm">{owner.address}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No previous owners recorded.</p>
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
                    <Label className="text-sm font-medium text-gray-500">Acquired Company</Label>
                    <p className="text-sm">{formatBoolean(sampleEmployerData.acquiredCompany)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Acquisition Date</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.acquisitionDate)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Incorporated Date</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.incorporatedDate)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Acquired Code</Label>
                    <p className="text-sm capitalize">{sampleEmployerData.acquiredCode || "Not specified"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Activity Type</Label>
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
                    <Label className="text-sm font-medium text-gray-500">Contact Telephone No. *</Label>
                    <p className="text-sm font-medium">{sampleEmployerData.telephone}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Contact Fax No.</Label>
                    <p className="text-sm">{sampleEmployerData.fax}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Email *</Label>
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
                    <Label className="text-sm font-medium text-gray-500">Village</Label>
                    <p className="text-sm">{sampleEmployerData.village}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Activity Type</Label>
                    <p className="text-sm">{sampleEmployerData.activityType}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Inspector Code</Label>
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
                    <Label className="text-sm font-medium text-gray-500">Date of Application</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.applicationDate)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Total Employees</Label>
                    <p className="text-sm">{sampleEmployerData.totalEmployees}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Male Employees</Label>
                    <p className="text-sm">{sampleEmployerData.maleEmployees}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Female Employees</Label>
                    <p className="text-sm">{sampleEmployerData.femaleEmployees}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Date Wages First Paid</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.dateWagesFirstPaid)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Date of Closure</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.dateOfClosure)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Re-registration Date</Label>
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
                    <Label className="text-sm font-medium text-gray-500">Computer Payroll</Label>
                    <p className="text-sm">{formatBoolean(sampleEmployerData.computerPayroll)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Make Model</Label>
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
                    <Label className="text-sm font-medium text-gray-500">Date of Entry</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.dateOfEntry)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Registration Date</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.registrationDate)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Entered By</Label>
                    <p className="text-sm">{sampleEmployerData.enteredBy}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Date Modified</Label>
                    <p className="text-sm">{formatDate(sampleEmployerData.dateModified)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">User ID</Label>
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
            className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">View </h1>
            
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
              <User className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
            </div>
            <div className="flex flex-col gap-1 justify-center">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 leading-tight">
              John Doe
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-gray-600 text-sm font-medium">Regn No.: TE0001</span>
                
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
              <Card className='py-5 mt-5' style={{backgroundColor:"#F9FAFB"}}>
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
                    className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md bg-sky-100"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex gap-3">
                    {currentStep < steps.length - 1 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="flex items-center gap-2 border-r-4 border-r-[#33529C]"
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