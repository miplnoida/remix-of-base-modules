import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SuccessDialog, ErrorDialog } from '@/components/ui/feedback';
import { toast } from 'sonner';

const compactEmployerSchema = z.object({
  // Left Column - Core Employer Information
  employerFullName: z.string().min(1, 'Employer full name is required'),
  businessTradeName: z.string().min(1, 'Business/Trade name is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  businessLocation: z.string().min(1, 'Business location is required'),
  additionalLocations: z.array(z.string()).optional(),
  businessType: z.string().min(1, 'Business type is required'),
  legalStatus: z.string().min(1, 'Legal status is required'),
  businessCommencementDate: z.date({ required_error: 'Business commencement date is required' }),
  employmentCommencementDate: z.date({ required_error: 'Employment commencement date is required' }),

  // Right Column - Additional Information
  firstWagePaidDate: z.date({ required_error: 'Date wages were first paid is required' }),
  numberOfEmployees: z.number().min(0, 'Number of employees must be 0 or greater'),
  businessActivities: z.string().min(1, 'Business activities description is required'),
  mailingAddress: z.string().min(1, 'Mailing address is required'),
  emailAddress: z.string().email('Invalid email address'),

  // Business Acquisition (Conditional)
  businessAcquired: z.enum(['yes', 'no']),
  previousBusinessName: z.string().optional(),
  previousBusinessAddress: z.string().optional(),
  acquisitionDate: z.date().optional(),

  // Payroll System
  payrollDigital: z.enum(['yes', 'no']),
  payrollSystemDescription: z.string().optional(),

  // Documents and Declaration
  businessRegistrationCert: z.any().optional(),
  employerIdProof: z.any().optional(),
  businessAddressProof: z.any().optional(),
  incorporationCertificate: z.any().optional(),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
});

type CompactEmployerFormData = z.infer<typeof compactEmployerSchema>;

export function CompactEmployerRegistration() {
  const [additionalLocations, setAdditionalLocations] = useState<string[]>([]);
  const [showAcquisitionFields, setShowAcquisitionFields] = useState(false);
  const [showPayrollDescription, setShowPayrollDescription] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  const form = useForm<CompactEmployerFormData>({
    resolver: zodResolver(compactEmployerSchema),
    defaultValues: {
      businessAcquired: 'no',
      payrollDigital: 'no',
      numberOfEmployees: 0,
      termsAccepted: false,
      additionalLocations: [],
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch, control } = form;
  const watchBusinessAcquired = watch('businessAcquired');
  const watchPayrollDigital = watch('payrollDigital');

  React.useEffect(() => {
    setShowAcquisitionFields(watchBusinessAcquired === 'yes');
  }, [watchBusinessAcquired]);

  React.useEffect(() => {
    setShowPayrollDescription(watchPayrollDigital === 'yes');
  }, [watchPayrollDigital]);

  const addLocation = () => {
    const newLocations = [...additionalLocations, ''];
    setAdditionalLocations(newLocations);
    setValue('additionalLocations', newLocations);
  };

  const removeLocation = (index: number) => {
    const newLocations = additionalLocations.filter((_, i) => i !== index);
    setAdditionalLocations(newLocations);
    setValue('additionalLocations', newLocations);
  };

  const updateLocation = (index: number, value: string) => {
    const newLocations = [...additionalLocations];
    newLocations[index] = value;
    setAdditionalLocations(newLocations);
    setValue('additionalLocations', newLocations);
  };

  const onSubmit = (data: CompactEmployerFormData) => {
    console.log('Compact Employer Registration submitted:', data);
    setShowSuccess(true);
  };

  const DatePicker = ({ field, placeholder }: { field: any; placeholder: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
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
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Employer Registration Form</h1>
        <p className="text-lg text-muted-foreground">Register your business with the Saint Kitts Social Security Board</p>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          Please complete all required fields below. Ensure all information is accurate as this will be used for your official registration with the Social Security Board.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="p-6">
            {/* Main Two-Column Layout */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column - Core Employer Information */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground border-b pb-2">Core Employer Information</h3>
                
                {/* Employer Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="employerFullName">Employer Full Name *</Label>
                  <Input
                    id="employerFullName"
                    {...register('employerFullName')}
                    placeholder="Enter full name of employer"
                  />
                  {errors.employerFullName && (
                    <p className="text-sm text-destructive">{errors.employerFullName.message}</p>
                  )}
                </div>

                {/* Business/Trade Name */}
                <div className="space-y-2">
                  <Label htmlFor="businessTradeName">Business/Trade Name *</Label>
                  <Input
                    id="businessTradeName"
                    {...register('businessTradeName')}
                    placeholder="Enter official business or trade name"
                  />
                  {errors.businessTradeName && (
                    <p className="text-sm text-destructive">{errors.businessTradeName.message}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    {...register('phoneNumber')}
                    placeholder="Enter contact phone number"
                  />
                  {errors.phoneNumber && (
                    <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
                  )}
                </div>

                {/* Business Location */}
                <div className="space-y-2">
                  <Label htmlFor="businessLocation">Business Location *</Label>
                  <Input
                    id="businessLocation"
                    {...register('businessLocation')}
                    placeholder="Enter primary business location"
                  />
                  {errors.businessLocation && (
                    <p className="text-sm text-destructive">{errors.businessLocation.message}</p>
                  )}
                </div>

                {/* Additional Locations */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Additional Locations (Optional)</Label>
                    <Button type="button" onClick={addLocation} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Location
                    </Button>
                  </div>
                  {additionalLocations.map((location, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={location}
                        onChange={(e) => updateLocation(index, e.target.value)}
                        placeholder={`Additional location ${index + 1}`}
                      />
                      <Button
                        type="button"
                        onClick={() => removeLocation(index)}
                        size="sm"
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Business Type */}
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type *</Label>
                  <Select onValueChange={(value) => setValue('businessType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sole-proprietorship">Sole Proprietorship</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="government-ministry">Government Ministry</SelectItem>
                      <SelectItem value="non-profit">Non-Profit Organization</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.businessType && (
                    <p className="text-sm text-destructive">{errors.businessType.message}</p>
                  )}
                </div>

                {/* Legal Status */}
                <div className="space-y-2">
                  <Label htmlFor="legalStatus">Legal Status *</Label>
                  <Select onValueChange={(value) => setValue('legalStatus', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select legal status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="government-ministry">Government Ministry</SelectItem>
                      <SelectItem value="corporation">Corporation</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.legalStatus && (
                    <p className="text-sm text-destructive">{errors.legalStatus.message}</p>
                  )}
                </div>

                {/* Date Fields */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Date of Business Commencement *</Label>
                    <DatePicker
                      field={{
                        value: watch('businessCommencementDate'),
                        onChange: (date: Date) => setValue('businessCommencementDate', date)
                      }}
                      placeholder="Select business start date"
                    />
                    {errors.businessCommencementDate && (
                      <p className="text-sm text-destructive">{errors.businessCommencementDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Date Employment Commenced *</Label>
                    <DatePicker
                      field={{
                        value: watch('employmentCommencementDate'),
                        onChange: (date: Date) => setValue('employmentCommencementDate', date)
                      }}
                      placeholder="Select employment start date"
                    />
                    {errors.employmentCommencementDate && (
                      <p className="text-sm text-destructive">{errors.employmentCommencementDate.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Additional Information */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground border-b pb-2">Additional Information</h3>

                {/* Date Wages Were First Paid */}
                <div className="space-y-2">
                  <Label>Date Wages Were First Paid *</Label>
                  <DatePicker
                    field={{
                      value: watch('firstWagePaidDate'),
                      onChange: (date: Date) => setValue('firstWagePaidDate', date)
                    }}
                    placeholder="Select first wage payment date"
                  />
                  {errors.firstWagePaidDate && (
                    <p className="text-sm text-destructive">{errors.firstWagePaidDate.message}</p>
                  )}
                </div>

                {/* Number of Employees */}
                <div className="space-y-2">
                  <Label htmlFor="numberOfEmployees">Approximate Number of Employees *</Label>
                  <Input
                    id="numberOfEmployees"
                    type="number"
                    min="0"
                    {...register('numberOfEmployees', { valueAsNumber: true })}
                    placeholder="Enter number of employees"
                  />
                  {errors.numberOfEmployees && (
                    <p className="text-sm text-destructive">{errors.numberOfEmployees.message}</p>
                  )}
                </div>

                {/* Type of Business Activities */}
                <div className="space-y-2">
                  <Label htmlFor="businessActivities">Type of Business Activities/Products *</Label>
                  <Textarea
                    id="businessActivities"
                    {...register('businessActivities')}
                    placeholder="Describe your business activities and products in detail"
                    rows={3}
                  />
                  {errors.businessActivities && (
                    <p className="text-sm text-destructive">{errors.businessActivities.message}</p>
                  )}
                </div>

                {/* Mailing Address */}
                <div className="space-y-2">
                  <Label htmlFor="mailingAddress">Mailing Address *</Label>
                  <Textarea
                    id="mailingAddress"
                    {...register('mailingAddress')}
                    placeholder="Enter complete mailing address"
                    rows={2}
                  />
                  {errors.mailingAddress && (
                    <p className="text-sm text-destructive">{errors.mailingAddress.message}</p>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                  <Label htmlFor="emailAddress">Email Address *</Label>
                  <Input
                    id="emailAddress"
                    type="email"
                    {...register('emailAddress')}
                    placeholder="Enter email address"
                  />
                  {errors.emailAddress && (
                    <p className="text-sm text-destructive">{errors.emailAddress.message}</p>
                  )}
                </div>

                {/* Business Acquisition */}
                <div className="space-y-3">
                  <Label>Was the business acquired from someone else? *</Label>
                  <RadioGroup
                    value={watch('businessAcquired')}
                    onValueChange={(value) => setValue('businessAcquired', value as 'yes' | 'no')}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="acquired-yes" />
                      <Label htmlFor="acquired-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="acquired-no" />
                      <Label htmlFor="acquired-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Conditional Business Acquisition Fields */}
                {showAcquisitionFields && (
                  <div className="space-y-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium text-foreground">Previous Business Information</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="previousBusinessName">Name of Previous Business or Owner</Label>
                      <Input
                        id="previousBusinessName"
                        {...register('previousBusinessName')}
                        placeholder="Enter previous business name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="previousBusinessAddress">Previous Business Address</Label>
                      <Textarea
                        id="previousBusinessAddress"
                        {...register('previousBusinessAddress')}
                        placeholder="Enter previous business address"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Date of Acquisition</Label>
                      <DatePicker
                        field={{
                          value: watch('acquisitionDate'),
                          onChange: (date: Date) => setValue('acquisitionDate', date)
                        }}
                        placeholder="Select acquisition date"
                      />
                    </div>
                  </div>
                )}

                {/* Payroll System */}
                <div className="space-y-3">
                  <Label>Is Payroll Managed Digitally? *</Label>
                  <RadioGroup
                    value={watch('payrollDigital')}
                    onValueChange={(value) => setValue('payrollDigital', value as 'yes' | 'no')}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="payroll-yes" />
                      <Label htmlFor="payroll-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="payroll-no" />
                      <Label htmlFor="payroll-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Conditional Payroll Description */}
                {showPayrollDescription && (
                  <div className="space-y-2">
                    <Label htmlFor="payrollSystemDescription">Describe Your Payroll System</Label>
                    <Textarea
                      id="payrollSystemDescription"
                      {...register('payrollSystemDescription')}
                      placeholder="Describe your digital payroll system in detail"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Section - Uploads and Declaration */}
        <Card>
          <CardHeader>
            <CardTitle>Required Documents & Declaration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Uploads */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Required Documents</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="businessRegistrationCert">Business Registration Certificate *</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PDF, JPG, PNG up to 10MB</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employerIdProof">Proof of Employer's ID *</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PDF, JPG, PNG up to 10MB</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Additional Documents</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="businessAddressProof">Proof of Business Address *</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PDF, JPG, PNG up to 10MB</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incorporationCertificate">Certificate of Incorporation (if applicable)</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">For overseas businesses</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Declaration & Consent */}
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium">Declaration & Consent</h4>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="termsAccepted"
                  checked={watch('termsAccepted')}
                  onCheckedChange={(checked) => setValue('termsAccepted', !!checked)}
                />
                <Label htmlFor="termsAccepted" className="text-sm leading-relaxed">
                  I agree to the terms and conditions of registration with the Social Security Board. 
                  I certify that all information provided is true and accurate to the best of my knowledge. 
                  I understand that providing false information may result in penalties or rejection of this application.
                </Label>
              </div>
              {errors.termsAccepted && (
                <p className="text-sm text-destructive">{errors.termsAccepted.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button type="submit" size="lg" className="px-8">
                Submit Registration
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <SuccessDialog
        open={showSuccess}
        onOpenChange={setShowSuccess}
        title="Registration submitted successfully"
        description="Your employer registration has been submitted for review. You will receive a confirmation email with your reference number."
      />
      <ErrorDialog
        open={showError}
        onOpenChange={setShowError}
        title="Validation error"
        description="Please fix the highlighted fields and try again."
      />
    </div>
  );
}