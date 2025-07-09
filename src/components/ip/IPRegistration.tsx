
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RegisterPersonForm } from './RegisterPersonForm';
import { DependentTab } from './DependentTab';
import { NotesTab } from './NotesTab';
import { NPFTab } from './NPFTab';
import { PhotoTab } from './PhotoTab';
import { CaricomTab } from './CaricomTab';
import { User, Users, FileText, Building, Camera, Globe } from 'lucide-react';

export const IPRegistration = () => {
  const [activeTab, setActiveTab] = useState('register');

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Insured Person Registration</h1>
          <p className="text-gray-600">Complete registration for new insured person</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
