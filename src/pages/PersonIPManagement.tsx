import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { UserCog, UserPlus, Users } from 'lucide-react';
import { IPListing } from '@/components/ip/IPListing';
import { ActiveInactiveIPListing } from '@/components/ip/ActiveInactiveIPListing';
import PendingReviews from './PendingReviews';
import { useNavigate } from 'react-router-dom';

const PersonIPManagement = () => {
  const [activeTab, setActiveTab] = useState('pending-verification');
  const navigate = useNavigate();
  const handleRegisterPerson = () => {
    // Navigate directly to register person page
    navigate('/person/register-tabs');
  };
  useEffect(() => {
    const handleSwitchToRegister = () => {
      // Navigate to register person page instead of switching tab
      window.location.href = '/person/register-tabs';
    };

    const handleSwitchToPendingVerification = () => {
      // Navigate to pending verification page instead of switching tab
      window.location.href = '/person/pending-verification';
    };

    window.addEventListener('switchToRegister', handleSwitchToRegister);
    window.addEventListener('switchToPendingVerification', handleSwitchToPendingVerification);
    return () => {
      window.removeEventListener('switchToRegister', handleSwitchToRegister);
      window.removeEventListener('switchToPendingVerification', handleSwitchToPendingVerification);
    };
  }, []);

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending-verification" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Pending Verification
          </TabsTrigger>
          <TabsTrigger value="registered-ip" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Registered IP Insured Person
          </TabsTrigger>
          <TabsTrigger value="active-inactive" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Active/Inactive Insured Person
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending-verification" className="space-y-4 lg:space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
            <Button 
              onClick={handleRegisterPerson}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Register Person
            </Button>
          </div>
          <PendingReviews/>
        </TabsContent>

        <TabsContent value="registered-ip" className="space-y-4 lg:space-y-6">
          <IPListing />
        </TabsContent>

        <TabsContent value="active-inactive" className="space-y-4 lg:space-y-6">
          <ActiveInactiveIPListing />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PersonIPManagement;