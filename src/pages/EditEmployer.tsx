import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DatePicker } from '@/components/ip/DatePicker';
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronRight,
  CalendarIcon,
  Download,
  Printer,
  Search,
  FileText,
  Save
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Employer form schema
const employerSchema = z.object({
  regNo: z.string().min(1, "Registration number is required"),
  name: z.string().min(1, "Employer name is required"),
  tradeName: z.string().min(1, "Trade name is required"),
  phone: z.string().min(1, "Phone is required"),
  fax: z.string().optional(),
  email: z.string().email("Invalid email format"),
  website: z.string().optional(),
  hqAddress1: z.string().min(1, "HQ Address 1 is required"),
  hqAddress2: z.string().optional(),
  mailingAddress1: z.string().min(1, "Mailing Address 1 is required"),
  mailingAddress2: z.string().optional(),
  activityType: z.string().min(1, "Activity type is required"),
  industrialCode: z.string().min(1, "Industrial code is required"),
  legalStatus: z.string().min(1, "Legal status is required"),
  inspectorCode: z.string().min(1, "Inspector code is required"),
  dateOfRegistration: z.date(),
  businessStartDate: z.date(),
  status: z.string().min(1, "Status is required"),
});

type EmployerFormData = z.infer<typeof employerSchema>;

// Sample employer data - in real app this would come from an API
const sampleEmployer = {
  regNo: "EMP001",
  name: "ABC Construction Ltd",
  tradeName: "ABC Construction",
  phone: "(869) 465-2345",
  fax: "(869) 465-2346",
  email: "info@abcconstruction.com",
  website: "www.abcconstruction.com",
  hqAddress1: "123 Main Street",
  hqAddress2: "Basseterre",
  mailingAddress1: "P.O. Box 123",
  mailingAddress2: "Basseterre",
  activityType: "Construction",
  industrialCode: "Building of Complete Con",
  legalStatus: "Limited Company",
  inspectorCode: "01 Vincent Sutton",
  dateOfRegistration: new Date("2023-01-15"),
  businessStartDate: new Date("2023-01-01"),
  status: "Active",
};

// Sample data for tabs (same as ViewEmployer)
const sampleC3Data = [
  { period: "2024-01", contributionDueSsb: 1500, contributionDueLevy: 800, contributionDueSev: 1200, ssbFinesDue: 0, levyPenalties: 0, severancePending: 0, totalWages: 50000 },
  { period: "2024-02", contributionDueSsb: 1600, contributionDueLevy: 850, contributionDueSev: 1300, ssbFinesDue: 100, levyPenalties: 50, severancePending: 200, totalWages: 52000 },
];

const sampleDirectorWages = [
  { ssn: "123456789", name: "John Director", payPeriod: "2024-01", recordWages: 8000, levyAmount: 240 },
  { ssn: "987654321", name: "Jane Director", payPeriod: "2024-01", recordWages: 7500, levyAmount: 225 },
];

const samplePaymentHistory = [
  { dateReceived: "2024-01-15", fundDescription: "SSB Contribution", grandTotal: 1500 },
  { dateReceived: "2024-01-20", fundDescription: "Levy Contribution", grandTotal: 800 },
];

const sampleEmployees = [
  { ssn: "111222333", surname: "Smith", firstName: "John", middleName: "A", sex: "M", dob: "1990-05-15", address: "123 Main St", nationality: "SKN", maritalStatus: "Single", phone: "4692345678", dateVerified: "2023-02-01", status: "Active" },
  { ssn: "444555666", surname: "Johnson", firstName: "Mary", middleName: "B", sex: "F", dob: "1985-08-22", address: "456 Oak Ave", nationality: "SKN", maritalStatus: "Married", phone: "4698765432", dateVerified: "2023-02-05", status: "Active" },
];

const sampleZoneTransactions = [
  { inspectorCode: "01", modifiedDate: "2024-01-15", modifiedBy: "Vincent Sutton" },
  { inspectorCode: "02", modifiedDate: "2024-01-20", modifiedBy: "Dexter Richardson" },
];

const sampleOversUnders = [
  { period: "2024-01", totalWages: 50000, numberEmployed: 40, oversSsb: 200, undersSsb: 100, oversLevy: 150, undersLevy: 80, oversSeverance: 180, undersSeverance: 90 },
  { period: "2024-02", totalWages: 52000, numberEmployed: 42, oversSsb: 220, undersSsb: 110, oversLevy: 160, undersLevy: 85, oversSeverance: 190, undersSeverance: 95 },
];

const EditEmployer = () => {
  const { regNo } = useParams();
  const navigate = useNavigate();
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('c3-details');
  
  // Date range filters for tabs
  const [dateRanges, setDateRanges] = useState({
    'c3-details': { from: undefined as Date | undefined, to: undefined as Date | undefined },
    'director-wages': { from: undefined as Date | undefined, to: undefined as Date | undefined },
    'payment-history': { from: undefined as Date | undefined, to: undefined as Date | undefined },
    'payment-history-vax': { from: undefined as Date | undefined, to: undefined as Date | undefined },
    'payment-history-c3': { from: undefined as Date | undefined, to: undefined as Date | undefined },
    'zone-transactions': { from: undefined as Date | undefined, to: undefined as Date | undefined },
    'overs-unders': { 
      from: undefined as Date | undefined, 
      to: undefined as Date | undefined,
      beganDate: undefined as Date | undefined,
      endDate: undefined as Date | undefined,
      asatDate: undefined as Date | undefined
    },
  });

  // Employee search
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Form setup
  const form = useForm<EmployerFormData>({
    resolver: zodResolver(employerSchema),
    defaultValues: sampleEmployer,
  });

  const handleBack = () => {
    navigate('/employers-management/manage');
  };

  const handleCancel = () => {
    navigate(`/employers-management/view/${regNo}`);
  };

  const onSubmit = (data: EmployerFormData) => {
    console.log('Updating employer:', data);
    toast({
      title: "Success",
      description: "Employer information updated successfully.",
    });
    navigate(`/employers-management/view/${regNo}`);
  };

  const handleExport = (tabName: string, format: 'excel' | 'pdf') => {
    console.log(`Exporting ${tabName} data as ${format}`);
    // Implement export functionality
  };

  const handlePrint = (tabName: string) => {
    console.log(`Printing ${tabName} data`);
    // Implement print functionality
  };

  const DateRangePicker = ({ tabKey, label, showExtraFields = false }: { 
    tabKey: string, 
    label?: string,
    showExtraFields?: boolean 
  }) => {
    const range = dateRanges[tabKey as keyof typeof dateRanges];
    
    return (
      <div className="flex flex-wrap gap-2 items-center">
        <Label className="text-sm font-medium">{label || "Date Range"}:</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn(!range?.from && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {range?.from ? format(range.from, "MMM dd") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={range?.from}
              onSelect={(date) => setDateRanges(prev => ({
                ...prev,
                [tabKey]: { ...prev[tabKey as keyof typeof prev], from: date }
              }))}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn(!range?.to && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {range?.to ? format(range.to, "MMM dd") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={range?.to}
              onSelect={(date) => setDateRanges(prev => ({
                ...prev,
                [tabKey]: { ...prev[tabKey as keyof typeof prev], to: date }
              }))}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        {showExtraFields && (
          <>
            <Label className="text-sm font-medium ml-4">Began Date:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(!(range as any)?.beganDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {(range as any)?.beganDate ? format((range as any).beganDate, "MMM dd") : "Began"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={(range as any)?.beganDate}
                  onSelect={(date) => setDateRanges(prev => ({
                    ...prev,
                    [tabKey]: { ...prev[tabKey as keyof typeof prev], beganDate: date }
                  }))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Label className="text-sm font-medium">End Date:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(!(range as any)?.endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {(range as any)?.endDate ? format((range as any).endDate, "MMM dd") : "End"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={(range as any)?.endDate}
                  onSelect={(date) => setDateRanges(prev => ({
                    ...prev,
                    [tabKey]: { ...prev[tabKey as keyof typeof prev], endDate: date }
                  }))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Label className="text-sm font-medium">Asat Date:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(!(range as any)?.asatDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {(range as any)?.asatDate ? format((range as any).asatDate, "MMM dd") : "Asat"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={(range as any)?.asatDate}
                  onSelect={(date) => setDateRanges(prev => ({
                    ...prev,
                    [tabKey]: { ...prev[tabKey as keyof typeof prev], asatDate: date }
                  }))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>
    );
  };

  const ActionButtons = ({ tabKey }: { tabKey: string }) => (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => handleExport(tabKey, 'excel')}
      >
        <Download className="h-4 w-4 mr-1" />
        Export Excel
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => handleExport(tabKey, 'pdf')}
      >
        <FileText className="h-4 w-4 mr-1" />
        Export PDF
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => handlePrint(tabKey)}
      >
        <Printer className="h-4 w-4 mr-1" />
        Print
      </Button>
    </div>
  );

  const filteredEmployees = sampleEmployees.filter(emp => 
    emp.ssn.includes(employeeSearch) ||
    `${emp.firstName} ${emp.surname}`.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.phone.includes(employeeSearch)
  );

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Manage Employers
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Employer Details</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Employer Registration Form (Editable) */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Employer Information</CardTitle>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {sampleEmployer.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="regNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly className="bg-gray-50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employer Name</FormLabel>
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
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="hqAddress1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HQ Address 1</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="hqAddress2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HQ Address 2</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="mailingAddress1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mailing Address 1</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="mailingAddress2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mailing Address 2</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select activity type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Construction">Construction</SelectItem>
                              <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                              <SelectItem value="Services">Services</SelectItem>
                              <SelectItem value="Retail">Retail</SelectItem>
                              <SelectItem value="Hospitality">Hospitality</SelectItem>
                            </SelectContent>
                          </Select>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select industrial code" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Building of Complete Con">Building of Complete Con</SelectItem>
                              <SelectItem value="Farming Domestic Animals">Farming Domestic Animals</SelectItem>
                              <SelectItem value="Other Services">Other Services</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="legalStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Legal Status</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select legal status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Limited Company">Limited Company</SelectItem>
                              <SelectItem value="Partnership">Partnership</SelectItem>
                              <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                              <SelectItem value="Corporation">Corporation</SelectItem>
                            </SelectContent>
                          </Select>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select inspector" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="00 Nevis">00 Nevis</SelectItem>
                              <SelectItem value="01 Vincent Sutton">01 Vincent Sutton</SelectItem>
                              <SelectItem value="02 Dexter Richardson">02 Dexter Richardson</SelectItem>
                              <SelectItem value="N04 Sheon Lewis">N04 Sheon Lewis</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dateOfRegistration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Date</FormLabel>
                        <FormControl>
                          <div>
                            <Input 
                              value={field.value ? format(field.value, "yyyy-MM-dd") : ""} 
                              readOnly 
                              className="bg-gray-50" 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="businessStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Start Date</FormLabel>
                        <FormControl>
                          <div>
                            <Input 
                              value={field.value ? format(field.value, "yyyy-MM-dd") : ""} 
                              readOnly 
                              className="bg-gray-50" 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="Inactive">Inactive</SelectItem>
                              <SelectItem value="Suspended">Suspended</SelectItem>
                              <SelectItem value="Closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Form Action Buttons */}
            <div className="flex gap-4 justify-end">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </Form>

        {/* Expandable Tabs Section (Same as ViewEmployer but read-only) */}
        <Card>
          <Collapsible open={isDetailsExpanded} onOpenChange={setIsDetailsExpanded}>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Detailed Employer Data</CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isDetailsExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            
            <CollapsibleContent>
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-9 bg-gray-50">
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

                  {/* C3 Details Tab */}
                  <TabsContent value="c3-details" className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <DateRangePicker tabKey="c3-details" />
                        <ActionButtons tabKey="c3-details" />
                      </div>
                      <div className="overflow-x-auto">
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
                            {sampleC3Data.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.period}</TableCell>
                                <TableCell>${item.contributionDueSsb.toLocaleString()}</TableCell>
                                <TableCell>${item.contributionDueLevy.toLocaleString()}</TableCell>
                                <TableCell>${item.contributionDueSev.toLocaleString()}</TableCell>
                                <TableCell>${item.ssbFinesDue.toLocaleString()}</TableCell>
                                <TableCell>${item.levyPenalties.toLocaleString()}</TableCell>
                                <TableCell>${item.severancePending.toLocaleString()}</TableCell>
                                <TableCell>${item.totalWages.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Director Wages Tab */}
                  <TabsContent value="director-wages" className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <DateRangePicker tabKey="director-wages" />
                        <ActionButtons tabKey="director-wages" />
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>SSN</TableHead>
                              <TableHead>Name of Director</TableHead>
                              <TableHead>Pay Period</TableHead>
                              <TableHead>Record Wages/Salaries</TableHead>
                              <TableHead>Levy Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sampleDirectorWages.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.ssn}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.payPeriod}</TableCell>
                                <TableCell>${item.recordWages.toLocaleString()}</TableCell>
                                <TableCell>${item.levyAmount.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Payment History Tab */}
                  <TabsContent value="payment-history" className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <DateRangePicker tabKey="payment-history" />
                        <ActionButtons tabKey="payment-history" />
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date Received</TableHead>
                              <TableHead>Fund Description</TableHead>
                              <TableHead>Grand Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {samplePaymentHistory.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.dateReceived}</TableCell>
                                <TableCell>{item.fundDescription}</TableCell>
                                <TableCell>${item.grandTotal.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Payment History (Vax) Tab */}
                  <TabsContent value="payment-history-vax" className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <DateRangePicker tabKey="payment-history-vax" />
                        <ActionButtons tabKey="payment-history-vax" />
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date Received</TableHead>
                              <TableHead>Fund Description</TableHead>
                              <TableHead>Grand Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                                No Vax payment history found
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Payment History (C3) Tab */}
                  <TabsContent value="payment-history-c3" className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <DateRangePicker tabKey="payment-history-c3" />
                        <ActionButtons tabKey="payment-history-c3" />
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date Received</TableHead>
                              <TableHead>Fund Description</TableHead>
                              <TableHead>Grand Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {samplePaymentHistory.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.dateReceived}</TableCell>
                                <TableCell>{item.fundDescription}</TableCell>
                                <TableCell>${item.grandTotal.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Employee List Tab */}
                  <TabsContent value="employee-list" className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              placeholder="Search by SSN, Name, or Phone"
                              value={employeeSearch}
                              onChange={(e) => setEmployeeSearch(e.target.value)}
                              className="pl-10 w-64"
                            />
                          </div>
                        </div>
                        <ActionButtons tabKey="employee-list" />
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>SSN</TableHead>
                              <TableHead>Surname</TableHead>
                              <TableHead>First Name</TableHead>
                              <TableHead>Middle Name</TableHead>
                              <TableHead>Sex</TableHead>
                              <TableHead>Date of Birth</TableHead>
                              <TableHead>Address</TableHead>
                              <TableHead>Nationality</TableHead>
                              <TableHead>Marital Status</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Date Verified</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredEmployees.map((employee, index) => (
                              <TableRow key={index}>
                                <TableCell>{employee.ssn}</TableCell>
                                <TableCell>{employee.surname}</TableCell>
                                <TableCell>{employee.firstName}</TableCell>
                                <TableCell>{employee.middleName}</TableCell>
                                <TableCell>{employee.sex}</TableCell>
                                <TableCell>{employee.dob}</TableCell>
                                <TableCell>{employee.address}</TableCell>
                                <TableCell>{employee.nationality}</TableCell>
                                <TableCell>{employee.maritalStatus}</TableCell>
                                <TableCell>{employee.phone}</TableCell>
                                <TableCell>{employee.dateVerified}</TableCell>
                                <TableCell>
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    {employee.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Arrears Report Tab */}
                  <TabsContent value="arrears-report" className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <DateRangePicker tabKey="arrears-report" />
                        <ActionButtons tabKey="arrears-report" />
                      </div>
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Arrears report data will be displayed here</p>
                        <p className="text-sm">Filter by date range and export options available</p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Zone Transactions Tab */}
                  <TabsContent value="zone-transactions" className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <DateRangePicker tabKey="zone-transactions" />
                        <ActionButtons tabKey="zone-transactions" />
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Inspector Code</TableHead>
                              <TableHead>Modified Date</TableHead>
                              <TableHead>Modified By</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sampleZoneTransactions.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.inspectorCode}</TableCell>
                                <TableCell>{item.modifiedDate}</TableCell>
                                <TableCell>{item.modifiedBy}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Overs & Unders Tab */}
                  <TabsContent value="overs-unders" className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <DateRangePicker tabKey="overs-unders" showExtraFields />
                        <ActionButtons tabKey="overs-unders" />
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Period</TableHead>
                              <TableHead>Total Wages</TableHead>
                              <TableHead>Number Employed</TableHead>
                              <TableHead>Overs (SSB)</TableHead>
                              <TableHead>Unders (SSB)</TableHead>
                              <TableHead>Overs (Levy)</TableHead>
                              <TableHead>Unders (Levy)</TableHead>
                              <TableHead>Overs (Severance)</TableHead>
                              <TableHead>Unders (Severance)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sampleOversUnders.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.period}</TableCell>
                                <TableCell>${item.totalWages.toLocaleString()}</TableCell>
                                <TableCell>{item.numberEmployed}</TableCell>
                                <TableCell>${item.oversSsb.toLocaleString()}</TableCell>
                                <TableCell>${item.undersSsb.toLocaleString()}</TableCell>
                                <TableCell>${item.oversLevy.toLocaleString()}</TableCell>
                                <TableCell>${item.undersLevy.toLocaleString()}</TableCell>
                                <TableCell>${item.oversSeverance.toLocaleString()}</TableCell>
                                <TableCell>${item.undersSeverance.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </div>
  );
};

export default EditEmployer;
