import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, Edit, Download, Printer, Search, ChevronDown, ChevronUp, Save, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

const employerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  tradeName: z.string().optional(),
  addressType: z.enum(["mailing", "hq"]),
  mailingAddress: z.string().optional(),
  mailingPostalCode: z.string().optional(),
  hqAddress: z.string().optional(),
  hqPostalCode: z.string().optional(),
  telephone: z.string().min(1, "Telephone is required"),
  fax: z.string().optional(),
  email: z.string().email("Invalid email").min(1, "Email is required"),
  parentRegNo: z.string().optional(),
  officeCode: z.string().optional(),
  ownershipCode: z.string().optional(),
  sectorCode: z.string().optional(),
  industrialCode: z.string().optional(),
  acquiredCompany: z.boolean().default(false),
  acquisitionDate: z.date().optional(),
  incorporatedDate: z.date().optional(),
  village: z.string().optional(),
  activityType: z.string().optional(),
  inspectorCode: z.string().optional(),
  applicationDate: z.date().optional(),
  totalEmployees: z.string().optional(),
  maleEmployees: z.string().optional(),
  femaleEmployees: z.string().optional(),
  dateWagesFirstPaid: z.date().optional(),
  dateOfClosure: z.date().optional(),
  reregistrationDate: z.date().optional(),
  computerPayroll: z.boolean().default(false),
  makeModel: z.string().optional(),
  dateOfEntry: z.date().optional(),
  registrationDate: z.date().optional(),
  enteredBy: z.string().optional(),
  dateModified: z.date().optional(),
  userId: z.string().optional(),
});

type EmployerFormData = z.infer<typeof employerSchema>;

export default function EditEmployer() {
  const { regNo } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("form-detail");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeneralInfoExpanded, setIsGeneralInfoExpanded] = useState(true);
  const [isContactInfoExpanded, setIsContactInfoExpanded] = useState(true);
  const [isEmploymentDetailsExpanded, setIsEmploymentDetailsExpanded] = useState(true);
  const [isPayrollRegistrationExpanded, setIsPayrollRegistrationExpanded] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const form = useForm<EmployerFormData>({
    resolver: zodResolver(employerSchema),
    defaultValues: {
      name: "Tech Solutions Ltd",
      tradeName: "TechSol",
      addressType: "mailing",
      mailingAddress: "123 Business Park, Nevis",
      mailingPostalCode: "12345",
      telephone: "+1 (869) 555-0123",
      email: "contact@techsolutions.com",
      acquiredCompany: false,
      computerPayroll: true,
      parentRegNo: "12345",
      officeCode: "OFF001",
      ownershipCode: "OWN001",
      sectorCode: "SEC001",
      industrialCode: "Account/Book-keep/Audit",
      village: "Adams Hill",
      activityType: "Technology Services",
      inspectorCode: "01 Vincent Sutton",
      totalEmployees: "25",
      maleEmployees: "15",
      femaleEmployees: "10",
      makeModel: "QuickBooks Pro",
      enteredBy: "System Administrator",
      userId: "ADMIN001",
    }
  });

  const industrialCodes = ["Account/Book-keep/Audit", "Act of other trans agency", "Admin of Financial Market", "Adult Education", "Gardening"];
  const villages = ["Adams Hill", "Barnaby", "Barnes Bhaut", "Clifton Estate"];
  const inspectorCodes = ["00 Nevis", "01 Vincent Sutton", "N04 Sheon Lewis"];

  const DatePicker = ({ field, placeholder }: any) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {field.value ? format(field.value, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );

  const onSubmit = (data: EmployerFormData) => {
    console.log('Updating employer:', data);
    toast({
      title: "Success",
      description: "Employer information updated successfully.",
    });
    navigate(`/employers-management/view/${regNo}`);
  };

  // Mock data for management tabs
  const c3Details = [
    { period: "2024-01", contributionDueSSB: "$2,500", contributionDueLevy: "$500", contributionDueSev: "$300", ssbFinesDue: "$0", levyPenalties: "$0", severancePending: "$0", totalWages: "$25,000" },
    { period: "2024-02", contributionDueSSB: "$2,700", contributionDueLevy: "$540", contributionDueSev: "$324", ssbFinesDue: "$0", levyPenalties: "$0", severancePending: "$0", totalWages: "$27,000" },
  ];

  const employeeList = [
    { ssn: "111-22-3333", surname: "Johnson", firstName: "Michael", middleName: "A", sex: "M", dob: "1990-05-15", address: "456 Main St", nationality: "Nevisian", maritalStatus: "Single", phone: "+1 869 555-0100", dateVerified: "2024-01-01", status: "Active" },
    { ssn: "444-55-6666", surname: "Williams", firstName: "Sarah", middleName: "B", sex: "F", dob: "1985-08-22", address: "789 Oak Ave", nationality: "Nevisian", maritalStatus: "Married", phone: "+1 869 555-0200", dateVerified: "2024-01-01", status: "Active" },
  ].filter(emp => 
    employeeSearch === '' || 
    emp.ssn.includes(employeeSearch) || 
    `${emp.firstName} ${emp.surname}`.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.phone.includes(employeeSearch)
  );

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/employers-management/manage')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Employers
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-government-900">Edit Employer Details</h1>
              <p className="text-government-600 mt-2">Update employer information with detailed data</p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 py-4">
          <Button variant="outline" onClick={() => navigate(`/employers-management/view/${regNo}`)}>
            <Edit className="h-4 w-4 mr-2" />
            View Employer
          </Button>
          <Button variant="outline">
            <AlertCircle className="h-4 w-4 mr-2" />
            Change Status
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Registration Certificate
          </Button>
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button type="submit" form="employer-form">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Form {...form}>
          <form id="employer-form" onSubmit={form.handleSubmit(onSubmit)}>
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
              {/* General Information */}
              <Collapsible open={isGeneralInfoExpanded} onOpenChange={setIsGeneralInfoExpanded}>
                <CollapsibleTrigger asChild>
                  <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        General Information
                        {isGeneralInfoExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tradeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trade Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="addressType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Type</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select address type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mailing">Mailing</SelectItem>
                              <SelectItem value="hq">Headquarters</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mailingAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mailing Address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mailingPostalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mailing Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hqAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Headquarters Address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hqPostalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Headquarters Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fax</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="parentRegNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent Registration No.</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="officeCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Office Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ownershipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ownership Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sectorCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sector Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="industrialCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industrial Code</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select industrial code" />
                            </SelectTrigger>
                            <SelectContent>
                              {industrialCodes.map(code => (
                                <SelectItem key={code} value={code}>{code}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="acquiredCompany"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <FormLabel className="mb-0">Acquired Company</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="acquisitionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acquisition Date</FormLabel>
                        <FormControl>
                          <DatePicker field={field} placeholder="Select acquisition date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="incorporatedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incorporated Date</FormLabel>
                        <FormControl>
                          <DatePicker field={field} placeholder="Select incorporated date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="village"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Village</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select village" />
                            </SelectTrigger>
                            <SelectContent>
                              {villages.map(village => (
                                <SelectItem key={village} value={village}>{village}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="activityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Activity Type</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inspectorCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inspector Code</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select inspector code" />
                            </SelectTrigger>
                            <SelectContent>
                              {inspectorCodes.map(code => (
                                <SelectItem key={code} value={code}>{code}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              </CollapsibleContent>
              </Collapsible>

              {/* Contact Information */}
              <Collapsible open={isContactInfoExpanded} onOpenChange={setIsContactInfoExpanded}>
                <CollapsibleTrigger asChild>
                  <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Contact Information
                        {isContactInfoExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                  <FormField
                    control={form.control}
                    name="telephone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Telephone No. *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              </CollapsibleContent>
              </Collapsible>

              {/* Employment Details */}
              <Collapsible open={isEmploymentDetailsExpanded} onOpenChange={setIsEmploymentDetailsExpanded}>
                <CollapsibleTrigger asChild>
                  <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Employment Details
                        {isEmploymentDetailsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                  <FormField
                    control={form.control}
                    name="totalEmployees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Employees</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maleEmployees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Male Employees</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="femaleEmployees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Female Employees</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              </CollapsibleContent>
              </Collapsible>

              {/* Payroll and Registration */}
              <Collapsible open={isPayrollRegistrationExpanded} onOpenChange={setIsPayrollRegistrationExpanded}>
                <CollapsibleTrigger asChild>
                  <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Payroll and Registration
                        {isPayrollRegistrationExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                  <FormField
                    control={form.control}
                    name="computerPayroll"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <FormLabel className="mb-0">Computer Payroll</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="makeModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Make/Model</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              </CollapsibleContent>
              </Collapsible>

              {/* Form Action Buttons */}
              <div className="flex gap-4 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate(`/employers-management/view/${regNo}`)}>
                  Cancel
                </Button>
              </div>
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
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No owners registered
                        </TableCell>
                      </TableRow>
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
                        <TableHead>Address</TableHead>
                        <TableHead>Postal Code</TableHead>
                        <TableHead>Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No locations registered
                        </TableCell>
                      </TableRow>
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
                  <p className="text-muted-foreground">No notes available.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commence-date" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Commence Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="applicationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Date</FormLabel>
                        <FormControl>
                          <DatePicker field={field} placeholder="Select application date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateWagesFirstPaid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Wages First Paid</FormLabel>
                        <FormControl>
                          <DatePicker field={field} placeholder="Select date wages first paid" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfClosure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Closure</FormLabel>
                        <FormControl>
                          <DatePicker field={field} placeholder="Select date of closure" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reregistrationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reregistration Date</FormLabel>
                        <FormControl>
                          <DatePicker field={field} placeholder="Select reregistration date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visits" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Visits</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No visit records available.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suits" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Suits</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No suits recorded.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
      </div>

      {/* Expandable Management Sections */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Employer Management Data
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0">
          <Tabs defaultValue="c3-details" className="w-full">
            <TabsList className="grid w-full grid-cols-9">
              <TabsTrigger value="c3-details">C3 Details</TabsTrigger>
              <TabsTrigger value="director-wages">Director Wages</TabsTrigger>
              <TabsTrigger value="payment-history">Payment History</TabsTrigger>
              <TabsTrigger value="payment-history-vax">Payment (Vax)</TabsTrigger>
              <TabsTrigger value="payment-history-c3">Payment (C3)</TabsTrigger>
              <TabsTrigger value="employee-list">Employee List</TabsTrigger>
              <TabsTrigger value="arrears-report">Arrears Report</TabsTrigger>
              <TabsTrigger value="zone-transactions">Zone Transactions</TabsTrigger>
              <TabsTrigger value="overs-unders">Overs & Unders</TabsTrigger>
            </TabsList>

            <TabsContent value="c3-details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    C3 Details
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                      <Button variant="outline" size="sm">
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Contribution Due (SSB)</TableHead>
                        <TableHead>Contribution Due (Levy)</TableHead>
                        <TableHead>Contribution Due (Sev)</TableHead>
                        <TableHead>SSB Fines Due</TableHead>
                        <TableHead>Levy Penalties</TableHead>
                        <TableHead>Severance Pending</TableHead>
                        <TableHead>Total Wages</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {c3Details.map((detail, index) => (
                        <TableRow key={index}>
                          <TableCell>{detail.period}</TableCell>
                          <TableCell>{detail.contributionDueSSB}</TableCell>
                          <TableCell>{detail.contributionDueLevy}</TableCell>
                          <TableCell>{detail.contributionDueSev}</TableCell>
                          <TableCell>{detail.ssbFinesDue}</TableCell>
                          <TableCell>{detail.levyPenalties}</TableCell>
                          <TableCell>{detail.severancePending}</TableCell>
                          <TableCell>{detail.totalWages}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="director-wages" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Director Wages</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No director wages data available.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment-history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No payment history available.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment-history-vax" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment (Vax)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No Vax payment data available.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment-history-c3" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment (C3)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No C3 payment data available.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employee-list" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Employee List
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        <Input
                          placeholder="Search by SSN, Name, or Phone"
                          value={employeeSearch}
                          onChange={(e) => setEmployeeSearch(e.target.value)}
                          className="w-64"
                        />
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SSN</TableHead>
                        <TableHead>Surname</TableHead>
                        <TableHead>First Name</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeList.map((employee, index) => (
                        <TableRow key={index}>
                          <TableCell>{employee.ssn}</TableCell>
                          <TableCell>{employee.surname}</TableCell>
                          <TableCell>{employee.firstName}</TableCell>
                          <TableCell>
                            <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                              {employee.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="arrears-report" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Arrears Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No arrears report available.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="zone-transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Zone Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No zone transactions available.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overs-unders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Overs & Unders</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No overs & unders data available.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
