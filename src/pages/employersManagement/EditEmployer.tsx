import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, ArrowLeft, ArrowRight, Save, Building2, Users, Phone, Settings, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Stepper, StepperStep } from '@/components/ui/stepper';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ErrorDialog, SuccessDialog } from '@/components/ui/feedback';


const employerSchema = z.object({
  // General Information
  name: z.string().min(1, "Name is required"),
  tradeName: z.string().optional(),
  addressType: z.enum(["mailing", "hq"]),
  mailingAddress: z.string().optional(),
  mailingPostalCode: z.string().optional(),
  hqAddress: z.string().optional(),
  hqPostalCode: z.string().optional(),
  previousOwners: z.array(z.object({
    name: z.string(),
    address: z.string()
  })).optional(),
  
  // Contact Information
  telephone: z.string().min(1, "Telephone is required").regex(/^\+?\d+$/, "Telephone must contain only digits").max(15, "Telephone exceeds max length"),
  fax: z.string().optional().refine(v => !v || /^\+?\d*$/.test(v), "Fax must contain only digits"),
  email: z.string().email("Invalid email format").min(1, "Email is required").max(40, "Email exceeds max length of 40"),
  
  // Organizational Information
  parentRegNo: z.string().optional(),
  officeCode: z.string().optional(),
  ownershipCode: z.string().optional(),
  sectorCode: z.string().optional(),
  industrialCode: z.string().optional(),
  
  // Acquisition / Incorporation
  acquiredCompany: z.boolean().default(false),
  acquisitionDate: z.date().optional(),
  incorporatedDate: z.date().optional(),
  acquiredCode: z.string().optional(),
  
  // Location Information
  village: z.string().optional(),
  activityType: z.string().optional(),
  inspectorCode: z.string().optional(),
  
  // Dates & Employees
  applicationDate: z.date().optional(),
  totalEmployees: z.string().optional(),
  maleEmployees: z.string().optional(),
  femaleEmployees: z.string().optional(),
  dateWagesFirstPaid: z.date().optional(),
  dateOfClosure: z.date().optional(),
  reregistrationDate: z.date().optional(),
  
  // Technical Information
  computerPayroll: z.boolean().default(false),
  makeModel: z.string().optional(),
  
  // Transaction Details
  dateOfEntry: z.date().optional(),
  registrationDate: z.date().optional(),
  enteredBy: z.string().optional(),
  dateModified: z.date().optional(),
  userId: z.string().optional(),
});

type EmployerFormData = z.infer<typeof employerSchema>;

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

export const EditEmployer = () => {
  const [activeTab, setActiveTab] = useState("form-detail");
  const [currentStep, setCurrentStep] = useState(0);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
  const navigate = useNavigate();

  const form = useForm<EmployerFormData>({
    resolver: zodResolver(employerSchema),
    defaultValues: {
      acquiredCompany: false,
      computerPayroll: false,
      addressType: "mailing",
      previousOwners: [],
    }
  });

  const { fields: previousOwnerFields, append: appendPreviousOwner, remove: removePreviousOwner } = useFieldArray({
    control: form.control,
    name: "previousOwners"
  });

  const industrialCodes = [
    "Account/Book-keep/Audit",
    "Act of other trans agency", 
    "Admin of Financial Market",
    "Adult Education",
    "Gardening"
  ];

  const villages = [
    "Adams Hill",
    "Barnaby", 
    "Barnes Bhaut",
    "Clifton Estate"
  ];

  const inspectorCodes = [
    "00 Nevis",
    "01 Vincent Sutton",
    "N04 Sheon Lewis"
  ];

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

  const onSubmit = (data: EmployerFormData) => {
    console.log("Form Data:", data);
    toast.success("Employer registration submitted successfully!");
  };

  const addOwner = () => {
    const newOwner: Owner = {
      id: Date.now().toString(),
      name: "",
      title: "",
      phoneNumber: ""
    };
    setOwners([...owners, newOwner]);
  };

  const updateOwner = (id: string, field: keyof Owner, value: string) => {
    setOwners(owners.map(owner => 
      owner.id === id ? { ...owner, [field]: value } : owner
    ));
  };

  const removeOwner = (id: string) => {
    setOwners(owners.filter(owner => owner.id !== id));
  };

  const addLocation = () => {
    const newLocation: Location = {
      id: Date.now().toString(),
      tradeName: "",
      locAddr1: "",
      locAddr2: "",
      activityType: ""
    };
    setLocations([...locations, newLocation]);
  };

  const updateLocation = (id: string, field: keyof Location, value: string) => {
    setLocations(locations.map(location => 
      location.id === id ? { ...location, [field]: value } : location
    ));
  };

  const removeLocation = (id: string) => {
    setLocations(locations.filter(location => location.id !== id));
  };

  const addNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      noteDate: new Date(),
      note: "",
      userId: "current-user"
    };
    setNotes([...notes, newNote]);
  };

  const updateNote = (id: string, field: keyof Note, value: string | Date) => {
    setNotes(notes.map(note => 
      note.id === id ? { ...note, [field]: value } : note
    ));
  };

  const removeNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const DatePicker = ({ field, placeholder }: any) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal mt-0",
            !field.value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {field.value ? format(field.value, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={field.value}
          onSelect={field.onChange}
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );

  // Step content components
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
                             <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField
                   control={form.control}
                   name="name"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Name *</FormLabel>
                       <FormControl>
                         <Input {...field} placeholder="Enter name" />
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
                         <Input {...field} placeholder="Enter trade name" />
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
                       <FormLabel>E-Mail Address</FormLabel>
                       <FormControl>
                         <Input {...field} type="email" placeholder="Enter e-mail address" />
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
                       <FormLabel>HQ Address *</FormLabel>
                       <FormControl>
                         <Input {...field} placeholder="Enter HQ address name" />
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
                       <FormLabel>Mailing Address *</FormLabel>
                       <FormControl>
                         <Input {...field} placeholder="Enter mailing Address" />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                
              </CardContent>
            </div>

                         {/* Previous Owner Information */}
               <div>
                 <CardHeader>
                   <CardTitle>Previous Owner Information</CardTitle>
                 </CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField
                     control={form.control}
                     name="previousOwners.0.name"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Name *</FormLabel>
                         <FormControl>
                           <Input {...field} placeholder="Enter name" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="previousOwners.0.address"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Address</FormLabel>
                         <FormControl>
                           <Input {...field} placeholder="Enter address" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </CardContent>
               </div>

                         {/* Organizational Information */}
               <div>
                 <CardHeader>
                 <CardTitle>Organizational Information</CardTitle>
                 </CardHeader>
               <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <FormField
                         control={form.control}
                   name="parentRegNo"
                         render={({ field }) => (
                           <FormItem>
                       <FormLabel>Parent Reg. No.</FormLabel>
                             <FormControl>
                         <Input {...field} type="number" />
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
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                         <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="Select Industrial Code" />
                             </SelectTrigger>
                         </FormControl>
                           <SelectContent>
                             {industrialCodes.map((code) => (
                               <SelectItem key={code} value={code}>{code}</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 
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
                 <CardTitle className="flex items-center justify-between">
                   Previous Owners
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={() => appendPreviousOwner({ name: "", address: "" })}
                   >
                     <Plus className="h-4 w-4 mr-2" />
                     Add Owner
                   </Button>
                 </CardTitle>
                 </CardHeader>
               <CardContent className="space-y-4">
                 {previousOwnerFields.map((field, index) => (
                   <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                     <FormField
                       control={form.control}
                       name={`previousOwners.${index}.name`}
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Previous Owner Name</FormLabel>
                           <FormControl>
                             <Input {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                     <FormField
                       control={form.control}
                       name={`previousOwners.${index}.address`}
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Previous Owner Address</FormLabel>
                           <FormControl>
                             <Input {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                     <Button
                       type="button"
                       variant="destructive"
                       size="sm"
                       onClick={() => removePreviousOwner(index)}
                       className="col-span-2 w-fit"
                     >
                       <Trash2 className="h-4 w-4 mr-2" />
                       Remove
                     </Button>
                   </div>
                 ))}
               </CardContent>
             </div>

             {/* Acquisition / Incorporation */}
             <div>
               <CardHeader>
                 <CardTitle>Acquisition / Incorporation</CardTitle>
               </CardHeader>
               <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField
                   control={form.control}
                   name="acquiredCompany"
                   render={({ field }) => (
                     <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                       <div className="space-y-0.5">
                         <FormLabel className="text-base">Acquired Company</FormLabel>
                       </div>
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
                   name="acquiredCode"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Acquired Code</FormLabel>
                       <FormControl>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <SelectTrigger>
                             <SelectValue placeholder="Select acquired code" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="yes">Yes</SelectItem>
                             <SelectItem value="no">No</SelectItem>
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
                         <Input {...field} placeholder="Enter activity type" />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
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
                 <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <FormField
                     control={form.control}
                   name="telephone"
                     render={({ field }) => (
                     <FormItem>
                       <FormLabel>Contact Telephone No. *</FormLabel>
                         <FormControl>
                         <Input {...field} placeholder="+1 (000) 000-0000" />
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
                       <FormLabel>Contact Fax No.</FormLabel>
                         <FormControl>
                         <Input {...field} placeholder="+1 (000) 000-0000" />
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
                         <Input {...field} type="email" />
                         </FormControl>
                       <FormMessage />
                       </FormItem>
                     )}
                   />
                 </CardContent>
               </div>

                           {/* Location Information */}
               <div>
                 <CardHeader>
                   <CardTitle>Location Information</CardTitle>
                 </CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <FormField
                     control={form.control}
                     name="village"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Select Village</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="Select village" />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             {villages.map((village) => (
                               <SelectItem key={village} value={village}>{village}</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
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
                         <FormLabel>Select Inspector Code</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="Select inspector code" />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             {inspectorCodes.map((code) => (
                               <SelectItem key={code} value={code}>{code}</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </CardContent>
               </div>

                           {/* Dates & Employees */}
               <div>
                 <CardHeader>
                   <CardTitle>Dates & Employees</CardTitle>
                 </CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <FormField
                     control={form.control}
                     name="applicationDate"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Date of Application</FormLabel>
                         <FormControl>
                           <DatePicker field={field} placeholder="Select application date" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="totalEmployees"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Total Employees</FormLabel>
                         <FormControl>
                           <Input {...field} type="number" />
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
                         <FormLabel>Male</FormLabel>
                         <FormControl>
                           <Input {...field} type="number" />
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
                         <FormLabel>Female</FormLabel>
                         <FormControl>
                           <Input {...field} type="number" />
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
                           <DatePicker field={field} placeholder="Select closure date" />
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
                         <FormLabel>Re-registration Date</FormLabel>
                         <FormControl>
                           <DatePicker field={field} placeholder="Select re-registration date" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
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
                 <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <FormField
                     control={form.control}
                     name="computerPayroll"
                     render={({ field }) => (
                       <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                         <div className="space-y-0.5">
                           <FormLabel className="text-base">Computer Payroll</FormLabel>
                         </div>
                         <FormControl>
                           <Switch checked={field.value} onCheckedChange={field.onChange}/>
                         </FormControl>
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="makeModel"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Make Model</FormLabel>
                         <FormControl>
                           <Input {...field} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </CardContent>
               </div>

                           {/* Transaction Details */}
               <div>
                 <CardHeader>
                   <CardTitle>Transaction Details</CardTitle>
                 </CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <FormField
                     control={form.control}
                     name="dateOfEntry"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Date of Entry</FormLabel>
                         <FormControl>
                           <DatePicker field={field} placeholder="Select Date Of Entry" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="registrationDate"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Registration Date</FormLabel>
                         <FormControl>
                           <DatePicker field={field} placeholder="Select Registration Date" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="enteredBy"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Entered By</FormLabel>
                         <FormControl>
                           <Input {...field} value="System Administrator" readOnly />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="dateModified"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Date Modified</FormLabel>
                         <FormControl>
                           <DatePicker field={field} placeholder="Select date modified" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="userId"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>User ID</FormLabel>
                         <FormControl>
                           <Input {...field} value="ADMIN001" readOnly />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
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
                
               
                
              </div>
              <div className="flex gap-2 self-start lg:self-center mt-4 lg:mt-0">
                <Button type="button" variant="outline"  className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md" onClick={() => setShowSuccess(true)}>
                  Draft
                </Button>
                <Button type="button" className="flex items-center gap-2 border-r-4 border-r-[#33529C]" onClick={() => setShowSuccess(true)}>
                  Submit
                </Button>
              </div>
      </div>
{/* New Person Info Card */}
      <Card className="mb-4">
        <CardContent className="py-4 px-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <User className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
            </div>
            <div className="flex flex-col gap-1 justify-center">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 leading-tight">
                Edit: John Michael Doe
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-gray-600 text-sm font-medium">SSN: 123456</span>
                
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
  <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
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
                <div>
                  {renderStepContent()}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-end items-center pt-6 px-5">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md bg-sky-100 mr-5"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                  </div>

                  <div className="flex gap-3">
                    {currentStep < steps.length - 1 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="flex items-center gap-2 border-r-4 border-r-[#33529C]"
                      >
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Submit
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="owners" className="space-y-6">
              <Card style={{backgroundColor:"#F9FAFB"}}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Owners
                    <Button type="button" onClick={addOwner}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Owner
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 m-5" style={{backgroundColor:"#fff"}}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Owner ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {owners.map((owner) => (
                        <TableRow key={owner.id}>
                          <TableCell>{owner.id}</TableCell>
                          <TableCell>
                            <Input
                              value={owner.name}
                              onChange={(e) => updateOwner(owner.id, 'name', e.target.value)}
                              placeholder="Enter name"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={owner.title}
                              onChange={(e) => updateOwner(owner.id, 'title', e.target.value)}
                              placeholder="Enter title"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={owner.phoneNumber}
                              onChange={(e) => updateOwner(owner.id, 'phoneNumber', e.target.value)}
                              placeholder="+1 (000) 000-0000"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeOwner(owner.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {owners.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No owners added yet. Click "Add Owner" to get started.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="locations" className="space-y-6">
              <Card style={{backgroundColor:"#F9FAFB"}}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Locations
                    <Button type="button" onClick={addLocation}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 m-5" style={{backgroundColor:"#fff"}}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location ID</TableHead>
                        <TableHead>Trade Name</TableHead>
                        <TableHead>Loc Addr1</TableHead>
                        <TableHead>Loc Addr2</TableHead>
                        <TableHead>Activity Type</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.map((location) => (
                        <TableRow key={location.id}>
                          <TableCell>{location.id}</TableCell>
                          <TableCell>
                            <Input
                              value={location.tradeName}
                              onChange={(e) => updateLocation(location.id, 'tradeName', e.target.value)}
                              placeholder="Enter trade name"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={location.locAddr1}
                              onChange={(e) => updateLocation(location.id, 'locAddr1', e.target.value)}
                              placeholder="Enter address 1"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={location.locAddr2}
                              onChange={(e) => updateLocation(location.id, 'locAddr2', e.target.value)}
                              placeholder="Enter address 2"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={location.activityType}
                              onChange={(e) => updateLocation(location.id, 'activityType', e.target.value)}
                              placeholder="Enter activity type"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeLocation(location.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {locations.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No locations added yet. Click "Add Location" to get started.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-6">
              <Card style={{backgroundColor:"#F9FAFB"}}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Notes
                    <Button type="button" onClick={addNote}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 m-5" style={{backgroundColor:"#fff"}}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Notes ID</TableHead>
                        <TableHead>Note Date</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>User's ID</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notes.map((note) => (
                        <TableRow key={note.id}>
                          <TableCell>{note.id}</TableCell>
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {format(note.noteDate, "PPP")}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={note.noteDate}
                                  onSelect={(date) => date && updateNote(note.id, 'noteDate', date)}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={note.note}
                              onChange={(e) => updateNote(note.id, 'note', e.target.value)}
                              placeholder="Enter note"
                              className="min-h-[80px]"
                            />
                          </TableCell>
                          <TableCell>{note.userId}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeNote(note.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {notes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No notes added yet. Click "Add Note" to get started.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commence-date" className="space-y-6">
               <Card style={{backgroundColor:"#F9FAFB"}}>
                <CardHeader>
                  <CardTitle>Commence Date</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 m-5" style={{backgroundColor:"#fff"}}>
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

          {/* <div className="flex justify-end space-x-4 mt-8">
            <Button type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit">
              Submit Registration
            </Button>
          </div> */}
        </form>
      </Form>
        </CardContent>
      
      </Card>
      <SuccessDialog
                open={showSuccess}
                onOpenChange={setShowSuccess}
                title="Submission successful"
                description="The registration has been saved."
              />
              <ErrorDialog
                open={showError}
                onOpenChange={setShowError}
                title="Validation error"
                description="Please fix the highlighted fields and try again."
              />
    </div>
  );
};