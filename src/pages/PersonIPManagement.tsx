import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCog, UserPlus } from 'lucide-react';
import { IPListing } from '@/components/ip/IPListing';
import { IPRegistration } from '@/components/ip/IPRegistration';

const PersonIPManagement = () => {
  const [activeTab, setActiveTab] = useState('listing');

  useEffect(() => {
    const handleSwitchToRegister = () => {
      setActiveTab('register');
    };

    window.addEventListener('switchToRegister', handleSwitchToRegister);
    return () => {
      window.removeEventListener('switchToRegister', handleSwitchToRegister);
    };
  }, []);

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="listing" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            IP Listing
          </TabsTrigger>
          <TabsTrigger value="register" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Register Person
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listing" className="space-y-4 lg:space-y-6">
          <IPListing />
        </TabsContent>

        <TabsContent value="register" className="space-y-4 lg:space-y-6">
          <IPRegistration />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PersonIPManagement;