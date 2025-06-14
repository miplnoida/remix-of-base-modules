import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { toast } from 'sonner';

import { BasicInformation } from '@/components/employer/BasicInformation';
import { BusinessDetails } from '@/components/employer/BusinessDetails';
import { LegalStatus } from '@/components/employer/LegalStatus';
import { KeyPersonnel } from '@/components/employer/KeyPersonnel';
import { BusinessHistory } from '@/components/employer/BusinessHistory';
import { Locations } from '@/components/employer/Locations';
import { TechnicalInfo } from '@/components/employer/TechnicalInfo';
import { Signatures } from '@/components/employer/Signatures';

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

const EmployerRegistration = () => {
  const [activeTab, setActiveTab] = useState('basic');
  
  const form = useForm<z.infer<typeof employerRegistrationSchema>>({
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

  const onSubmit = (values: z.infer<typeof employerRegistrationSchema>) => {
    console.log('Form submitted:', values);
    toast.success('Employer registration submitted successfully!');
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', component: BasicInformation },
    { id: 'business', label: 'Business Details', component: BusinessDetails },
    { id: 'legal', label: 'Legal Status', component: LegalStatus },
    { id: 'personnel', label: 'Key Personnel', component: KeyPersonnel },
    { id: 'history', label: 'Business History', component: BusinessHistory },
    { id: 'locations', label: 'Locations', component: Locations },
    { id: 'technical', label: 'Technical Info', component: TechnicalInfo },
    { id: 'signatures', label: 'Signatures', component: Signatures },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Employer Registration</h1>
                <p className="text-gray-600 mt-2">Complete all sections to register a new employer</p>
              </div>

              <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Registration Form</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-6">
                          {tabs.map((tab) => (
                            <TabsTrigger 
                              key={tab.id} 
                              value={tab.id}
                              className="text-xs px-2 py-1"
                            >
                              {tab.label}
                            </TabsTrigger>
                          ))}
                        </TabsList>

                        {tabs.map((tab) => {
                          const Component = tab.component;
                          return (
                            <TabsContent key={tab.id} value={tab.id} className="mt-6">
                              <Component />
                            </TabsContent>
                          );
                        })}
                      </Tabs>

                      <div className="flex justify-between mt-8 pt-6 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
                            if (currentIndex > 0) {
                              setActiveTab(tabs[currentIndex - 1].id);
                            }
                          }}
                          disabled={activeTab === tabs[0].id}
                        >
                          Previous
                        </Button>

                        {activeTab === tabs[tabs.length - 1].id ? (
                          <Button type="submit" className="bg-green-600 hover:bg-green-700">
                            Submit Registration
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => {
                              const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
                              if (currentIndex < tabs.length - 1) {
                                setActiveTab(tabs[currentIndex + 1].id);
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Next
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </form>
              </FormProvider>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default EmployerRegistration;
