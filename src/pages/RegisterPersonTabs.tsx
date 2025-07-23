import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users } from 'lucide-react';
import { IPRegistration } from '@/components/ip/IPRegistration';

const RegisterPersonTabs = () => {
  const [activeTab, setActiveTab] = useState('pending-reviews');

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending-reviews" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Pending Reviews</span>
                <span className="sm:hidden">Pending</span>
              </TabsTrigger>
              <TabsTrigger value="ip-listing" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">IP Listing</span>
                <span className="sm:hidden">Listing</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending-reviews" className="mt-6">
              <IPRegistration />
            </TabsContent>

            <TabsContent value="ip-listing" className="mt-6">
              <IPRegistration />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPersonTabs;