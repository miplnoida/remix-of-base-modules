
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RegisterPersonForm } from './RegisterPersonForm';
import { DependentTab } from './DependentTab';
import { NotesTab } from './NotesTab';
import { NPFTab } from './NPFTab';
import { PhotoTab } from './PhotoTab';
import { CaricomTab } from './CaricomTab';
import { SelfEmployDetailsTab, WagesCategoryTab, BusinessLocationsTab, ContributionHistoryTab, SEPStatusPanel } from './sep';
import { User, Users, FileText, Building, Camera, Globe, Briefcase, DollarSign, MapPin, Receipt, ShieldCheck } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { SuccessDialog, ErrorDialog } from '@/components/ui/feedback';
import { useSelfEmployed } from '@/hooks/useSelfEmployed';

export const IPRegistration = () => {
  const [activeTab, setActiveTab] = useState('register');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get SSN from route state or URL params if available
  const ssn = (location.state as any)?.ssn || '';
  
  // Initialize SEP hook
  const selfEmployed = useSelfEmployed(ssn || null);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/person/management')}
            className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
           
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="h-6 w-px bg-border" />
         
          <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Register Person</h1>
          
          </div>
        </div>
        <div className="flex gap-2 self-start lg:self-center mt-4 lg:mt-0">
          <Button type="button" variant="outline"  className="flex items-center gap-2 border-0 border-l-2 border-l-primary shadow-md" onClick={() => setShowSuccess(true)}>
            Draft
          </Button>
          <Button type="button" className="flex items-center gap-2 border-r-4 border-r-primary" onClick={() => setShowSuccess(true)}>
            Submit
          </Button>
        </div>
</div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      
       
      </div>

     <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-11">
              <TabsTrigger value="register" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Register Person</span>
                <span className="sm:hidden">Register</span>
              </TabsTrigger>
              <TabsTrigger value="dependent" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Dependent</span>
                <span className="sm:hidden">Dep</span>
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Notes</span>
                <span className="sm:hidden">Notes</span>
              </TabsTrigger>
              <TabsTrigger value="npf" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">NPF</span>
                <span className="sm:hidden">NPF</span>
              </TabsTrigger>
              <TabsTrigger value="photo" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline">Photo</span>
                <span className="sm:hidden">Photo</span>
              </TabsTrigger>
              <TabsTrigger value="caricom" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Caricom</span>
                <span className="sm:hidden">Caricom</span>
              </TabsTrigger>
              <TabsTrigger value="self-employ" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline">Self Emp. Details</span>
                <span className="sm:hidden">SEP</span>
              </TabsTrigger>
              <TabsTrigger value="wages-category" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Wages Category</span>
                <span className="sm:hidden">Wages</span>
              </TabsTrigger>
              <TabsTrigger value="business-locations" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Business Locations</span>
                <span className="sm:hidden">Loc</span>
              </TabsTrigger>
              <TabsTrigger value="contributions" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Contributions</span>
                <span className="sm:hidden">C3</span>
              </TabsTrigger>
              <TabsTrigger value="sep-status" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Status & Audit</span>
                <span className="sm:hidden">Status</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="register" className="mt-6">
              <RegisterPersonForm />
            </TabsContent>

            <TabsContent value="dependent" className="mt-6">
              <DependentTab />
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              <NotesTab />
            </TabsContent>

            <TabsContent value="npf" className="mt-6">
              <NPFTab />
            </TabsContent>

            <TabsContent value="photo" className="mt-6">
              <PhotoTab />
            </TabsContent>

            <TabsContent value="caricom" className="mt-6">
              <CaricomTab />
            </TabsContent>

            <TabsContent value="self-employ" className="mt-6">
              <SelfEmployDetailsTab ssn={ssn} selfEmployed={selfEmployed} />
            </TabsContent>

            <TabsContent value="wages-category" className="mt-6">
              <WagesCategoryTab ssn={ssn} selfEmployed={selfEmployed} />
            </TabsContent>

            <TabsContent value="business-locations" className="mt-6">
              <BusinessLocationsTab ssn={ssn} selfEmployed={selfEmployed} />
            </TabsContent>

            <TabsContent value="contributions" className="mt-6">
              <ContributionHistoryTab ssn={ssn} selfEmployed={selfEmployed} />
            </TabsContent>

            <TabsContent value="sep-status" className="mt-6">
              <SEPStatusPanel ssn={ssn} selfEmployed={selfEmployed} />
            </TabsContent>
          </Tabs>
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
