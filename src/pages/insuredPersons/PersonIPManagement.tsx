import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, ChevronUp, Calendar, RotateCcw } from 'lucide-react';
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
    dob: '',
    surname: '',
    firstName: '',
    phoneNo: '',
    selfRefNo: '',
    gender: '',
    status: ''
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
           
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">IP Management</h1>
            <Button 
              onClick={handleRegisterPerson}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <UserPlus className="h-4 w-4" />
              Register Person
            </Button>
          </div>

       
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
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className='mt-5'>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base lg:text-lg">
                        Query by
                      </CardTitle>
                      <p className='text-[#9D9D9D]'>Filter and search IP Management</p>
                    </div>
                    {isFiltersOpen ? <ChevronUp className="h-4 w-4 lg:h-5 lg:w-5" /> : <ChevronDown className="h-4 w-4 lg:h-5 lg:w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {/* First row of fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium">SSN No.</label>
                      <Input
                        placeholder="Enter 6-digit SSN"
                        value={searchParams.ssn}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, ssn: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">DOB</label>
                      <div className="relative">
                        <Input
                          placeholder="mm/dd/yyyy"
                          value={searchParams.dob}
                          onChange={(e) => setSearchParams(prev => ({ ...prev, dob: e.target.value }))}
                        />
                        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Surname</label>
                      <Input
                        placeholder="Enter surname"
                        value={searchParams.surname}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, surname: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">First name</label>
                      <Input
                        placeholder="Enter first name"
                        value={searchParams.firstName}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  {/* Second row of fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium">Phone No.</label>
                      <Input
                        placeholder="Enter phone No."
                        value={searchParams.phoneNo}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, phoneNo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Self Ref No.</label>
                      <Input
                        placeholder="Enter self reference No."
                        value={searchParams.selfRefNo}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, selfRefNo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Gender</label>
                      <Select value={searchParams.gender} onValueChange={(value) => setSearchParams(prev => ({ ...prev, gender: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
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
                  </div>
                  
                  <div className="flex flex-wrap gap-2 lg:gap-3">
                    <Button onClick={handleSearch} className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Search
                    </Button>
                    <Button variant="outline" onClick={() => setSearchParams({
                      ssn: '', dob: '', surname: '', firstName: '', phoneNo: '', selfRefNo: '', gender: '', status: ''
                    })} className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
          <IPListing />
        </TabsContent>

        <TabsContent value="active-inactive" className="space-y-4 lg:space-y-6">
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className='mt-5'>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base lg:text-lg">
                        Query by
                      </CardTitle>
                      <p className='text-[#9D9D9D]'>Filter and search IP Management</p>
                    </div>
                    {isFiltersOpen ? <ChevronUp className="h-4 w-4 lg:h-5 lg:w-5" /> : <ChevronDown className="h-4 w-4 lg:h-5 lg:w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {/* First row of fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium">SSN No.</label>
                      <Input
                        placeholder="Enter 6-digit SSN"
                        value={searchParams.ssn}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, ssn: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">DOB</label>
                      <div className="relative">
                        <Input
                          placeholder="mm/dd/yyyy"
                          value={searchParams.dob}
                          onChange={(e) => setSearchParams(prev => ({ ...prev, dob: e.target.value }))}
                        />
                        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Surname</label>
                      <Input
                        placeholder="Enter surname"
                        value={searchParams.surname}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, surname: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">First name</label>
                      <Input
                        placeholder="Enter first name"
                        value={searchParams.firstName}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  {/* Second row of fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium">Phone No.</label>
                      <Input
                        placeholder="Enter phone No."
                        value={searchParams.phoneNo}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, phoneNo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Self Ref No.</label>
                      <Input
                        placeholder="Enter self reference No."
                        value={searchParams.selfRefNo}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, selfRefNo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Gender</label>
                      <Select value={searchParams.gender} onValueChange={(value) => setSearchParams(prev => ({ ...prev, gender: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
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
                  </div>
                  
                  <div className="flex flex-wrap gap-2 lg:gap-3">
                    <Button onClick={handleSearch} className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Search
                    </Button>
                    <Button variant="outline" onClick={() => setSearchParams({
                      ssn: '', dob: '', surname: '', firstName: '', phoneNo: '', selfRefNo: '', gender: '', status: ''
                    })} className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
          <ActiveInactiveIPListing />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PersonIPManagement;