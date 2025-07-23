import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCog, UserPlus } from 'lucide-react';
import { IPListing } from '@/components/ip/IPListing';

const PersonIPManagement = () => {
  const [activeTab, setActiveTab] = useState('pending-reviews');

  useEffect(() => {
    const handleSwitchToRegister = () => {
      // Navigate to register person page instead of switching tab
      window.location.href = '/person/register-tabs';
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
          <TabsTrigger value="pending-reviews" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Pending Reviews
          </TabsTrigger>
          <TabsTrigger value="listing" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            IP Listing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending-reviews" className="space-y-4 lg:space-y-6">
          <IPListing />
        </TabsContent>

        <TabsContent value="listing" className="space-y-4 lg:space-y-6">
          <IPListing />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PersonIPManagement;