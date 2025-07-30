import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { UserCog, UserPlus, Users } from 'lucide-react';
import { IPListing } from '@/components/ip/IPListing';
import { ActiveInactiveIPListing } from '@/components/ip/ActiveInactiveIPListing';
import PendingReviews from './PendingReviews';
import { useNavigate } from 'react-router-dom';

const PersonIPManagement = () => {
  const [activeTab, setActiveTab] = useState('pending-verification');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchParams, setSearchParams] = useState({
    ssn: '',
    name: '',
    dob: '',
    status: '',
    applicationDate: '',
    assignedOfficer: ''
  });
  const navigate = useNavigate();

  const handleSearch = () => {
    console.log('Searching with parameters:', searchParams);
  };

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
       {/* Expandable Filter Section */}
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

       <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base lg:text-lg">
                        Query by
                      </CardTitle>
                    </div>
                    {isFiltersOpen ? <ChevronUp className="h-4 w-4 lg:h-5 lg:w-5" /> : <ChevronDown className="h-4 w-4 lg:h-5 lg:w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium">SSN</label>
                      <Input
                        placeholder="Enter SSN"
                        value={searchParams.ssn}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, ssn: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        placeholder="Enter name"
                        value={searchParams.name}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Date of Birth</label>
                      <Input
                        type="date"
                        value={searchParams.dob}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, dob: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Select value={searchParams.status} onValueChange={(value) => setSearchParams(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending Review">Pending Review</SelectItem>
                          <SelectItem value="Under Review">Under Review</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Application Date</label>
                      <Input
                        type="date"
                        value={searchParams.applicationDate}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, applicationDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Assigned Officer</label>
                      <Input
                        placeholder="Enter officer name"
                        value={searchParams.assignedOfficer}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, assignedOfficer: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 lg:gap-3">
                    <Button onClick={handleSearch} className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Search
                    </Button>
                    <Button variant="outline" onClick={() => setSearchParams({
                      ssn: '', name: '', dob: '', status: '', applicationDate: '', assignedOfficer: ''
                    })}>
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending-verification" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Pending Verification
          </TabsTrigger>
          <TabsTrigger value="registered-ip" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Registered Insured Person
          </TabsTrigger>
          <TabsTrigger value="active-inactive" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Inactive Insured Person
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending-verification" className="space-y-4 lg:space-y-6">
      
         

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