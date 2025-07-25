import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { UserCog, UserPlus } from 'lucide-react';
import { IPListing } from '@/components/ip/IPListing';
import PendingReviews from './PendingReviews';
import { useNavigate } from 'react-router-dom';

const PersonIPManagement = () => {
  const [activeTab, setActiveTab] = useState('pending-reviews');
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

    const handleSwitchToPendingReviews = () => {
      // Navigate to pending reviews page instead of switching tab
      window.location.href = '/person/pending-reviews';
    };

    window.addEventListener('switchToRegister', handleSwitchToRegister);
    window.addEventListener('switchToPendingReviews', handleSwitchToPendingReviews);
    return () => {
      window.removeEventListener('switchToRegister', handleSwitchToRegister);
      window.removeEventListener('switchToPendingReviews', handleSwitchToPendingReviews);
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
          {/* <div className="text-center p-8">
            <p className="text-muted-foreground mb-4">Pending Reviews content will open in dedicated page</p>
            <Button onClick={() => window.location.href = '/person/pending-reviews'}>
              Go to Pending Reviews
            </Button>
          </div> */}
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

        <TabsContent value="listing" className="space-y-4 lg:space-y-6">
          <IPListing />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PersonIPManagement;