
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BasicInformation } from '@/components/employer/BasicInformation';
import { BusinessDetails } from '@/components/employer/BusinessDetails';
import { LegalStatus } from '@/components/employer/LegalStatus';
import { KeyPersonnel } from '@/components/employer/KeyPersonnel';
import { BusinessHistory } from '@/components/employer/BusinessHistory';
import { Locations } from '@/components/employer/Locations';
import { TechnicalInfo } from '@/components/employer/TechnicalInfo';
import { Signatures } from '@/components/employer/Signatures';
import { Building2, FileText, Users, MapPin, Computer, PenTool, CheckCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const employerRegistrationSchema = z.object({
  // Basic Information
  employerName: z.string().min(1, 'Employer name is required'),
  tradeName: z.string().optional(),
  businessAddress: z.string().min(1, 'Business address is required'),
  country: z.string().min(1, 'Country is required'),
  telephoneNumber: z.string().min(1, 'Telephone number is required'),
  
  // Business Details
  activityType: z.string().min(1, 'Type of activity is required'),
  activityDescription: z.string().optional(),
  dateTradeCommenced: z.string().min(1, 'Date trade commenced is required'),
  dateEmploymentCommenced: z.string().min(1, 'Date employment commenced is required'),
  dateWagesFirstPaid: z.string().min(1, 'Date wages first paid is required'),
  
  // Employee Information
  employedPersonsMale: z.number().min(0, 'Must be 0 or greater'),
  employedPersonsFemale: z.number().min(0, 'Must be 0 or greater'),
  
  // Legal Status
  legalStatus: z.string().min(1, 'Legal status is required'),
  otherLegalEntity: z.string().optional(),
  documentationSubmitted: z.string().optional(),
  
  // Key Personnel
  keyPersonnel: z.array(z.object({
    name: z.string(),
    address: z.string(),
    position: z.string(),
    telephoneNo: z.string(),
  })).optional(),
  
  // Business History
  isAcquiredBusiness: z.boolean(),
  previousBusinessName: z.string().optional(),
  previousOwnerAddress: z.string().optional(),
  acquisitionDate: z.string().optional(),
  
  // Locations
  locations: z.array(z.object({
    tradeName: z.string(),
    location: z.string(),
    activityType: z.string(),
  })).optional(),
  
  // Technical Information
  payrollOnComputer: z.boolean(),
  computerMakeModel: z.string().optional(),
  emailAddress: z.string().email('Invalid email address').optional(),
  
  // Signatures
  signatures: z.array(z.string()).optional(),
  printNames: z.array(z.string()).optional(),
  positions: z.array(z.string()).optional(),
  dates: z.array(z.string()).optional(),
});

type EmployerRegistrationData = z.infer<typeof employerRegistrationSchema>;

export default function EmployerRegistration() {
  const [currentTab, setCurrentTab] = useState('basic');
  
  const form = useForm<EmployerRegistrationData>({
    resolver: zodResolver(employerRegistrationSchema),
    defaultValues: {
      employedPersonsMale: 0,
      employedPersonsFemale: 0,
      isAcquiredBusiness: false,
      payrollOnComputer: false,
      keyPersonnel: [{ name: '', address: '', position: '', telephoneNo: '' }],
      locations: [{ tradeName: '', location: '', activityType: '' }],
      signatures: [''],
      printNames: [''],
      positions: [''],
      dates: [''],
    },
  });

  const onSubmit = (data: EmployerRegistrationData) => {
    console.log('Employer registration data:', data);
    toast.success('Employer registration submitted successfully!');
    // Here you would typically submit to your backend
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Building2 },
    { id: 'business', label: 'Business Details', icon: FileText },
    { id: 'legal', label: 'Legal Status', icon: CheckCircle },
    { id: 'personnel', label: 'Key Personnel', icon: Users },
    { id: 'history', label: 'Business History', icon: Calendar },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'technical', label: 'Technical Info', icon: Computer },
    { id: 'signatures', label: 'Signatures', icon: PenTool },
  ];

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Employer Registration</h1>
        <p className="text-gray-600 mt-2">Complete all sections to register as an employer with the Social Security Board</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader className="bg-green-900 text-white">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                ST. CHRISTOPHER AND NEVIS SOCIAL SECURITY BOARD - EMPLOYER REGISTRATION
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-6">
                  {tabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1">
                      <tab.icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="basic">
                  <BasicInformation />
                </TabsContent>

                <TabsContent value="business">
                  <BusinessDetails />
                </TabsContent>

                <TabsContent value="legal">
                  <LegalStatus />
                </TabsContent>

                <TabsContent value="personnel">
                  <KeyPersonnel />
                </TabsContent>

                <TabsContent value="history">
                  <BusinessHistory />
                </TabsContent>

                <TabsContent value="locations">
                  <Locations />
                </TabsContent>

                <TabsContent value="technical">
                  <TechnicalInfo />
                </TabsContent>

                <TabsContent value="signatures">
                  <Signatures />
                </TabsContent>
              </Tabs>

              <div className="flex justify-between mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const currentIndex = tabs.findIndex(tab => tab.id === currentTab);
                    if (currentIndex > 0) {
                      setCurrentTab(tabs[currentIndex - 1].id);
                    }
                  }}
                  disabled={currentTab === 'basic'}
                >
                  Previous
                </Button>
                
                {currentTab === 'signatures' ? (
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Submit Registration
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      const currentIndex = tabs.findIndex(tab => tab.id === currentTab);
                      if (currentIndex < tabs.length - 1) {
                        setCurrentTab(tabs[currentIndex + 1].id);
                      }
                    }}
                  >
                    Next
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
