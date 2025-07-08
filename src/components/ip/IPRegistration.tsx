
import React, { useState } from 'react';
import { AddIPForm } from '@/components/person/AddIPForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  IdCard,
  FileText,
  Download,
  Printer
} from 'lucide-react';

export const IPRegistration = () => {
  const [activeSubTab, setActiveSubTab] = useState('register');

  const handleGenerateIDCard = () => {
    console.log('Generating ID Card...');
    // Implement ID card generation logic
  };

  const handlePrintIDCard = () => {
    console.log('Printing ID Card...');
    // Implement ID card printing logic
  };

  const handleDownloadIDCard = () => {
    console.log('Downloading ID Card...');
    // Implement ID card download logic
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Register New Insured Person</h2>
          <p className="text-sm text-gray-600">Complete registration form and generate ID card</p>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="register" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <User className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden sm:inline">Registration Form</span>
            <span className="sm:hidden">Register</span>
          </TabsTrigger>
          <TabsTrigger value="id-card" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <IdCard className="h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden sm:inline">ID Card Generation</span>
            <span className="sm:hidden">ID Card</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4 lg:space-y-6">
          <AddIPForm />
        </TabsContent>

        <TabsContent value="id-card" className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IdCard className="h-5 w-5" />
                ID Card Generation & Management
              </CardTitle>
              <CardDescription>
                Generate, print, and manage ID cards for registered insured persons
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ID Card Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button 
                  onClick={handleGenerateIDCard}
                  className="h-20 flex flex-col gap-2"
                >
                  <IdCard className="h-6 w-6" />
                  <span className="text-sm">Generate New ID Card</span>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handlePrintIDCard}
                  className="h-20 flex flex-col gap-2"
                >
                  <Printer className="h-6 w-6" />
                  <span className="text-sm">Print ID Card</span>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleDownloadIDCard}
                  className="h-20 flex flex-col gap-2"
                >
                  <Download className="h-6 w-6" />
                  <span className="text-sm">Download ID Card</span>
                </Button>
              </div>

              {/* ID Card Status Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Card Status Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-600">Temporary Card Date:</p>
                        <p className="text-gray-900">Not Generated</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">Permanent Card Date:</p>
                        <p className="text-gray-900">Not Generated</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">Card Expiration:</p>
                        <p className="text-gray-900">N/A</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">Date Card Received:</p>
                        <p className="text-gray-900">Not Received</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Card Generation Guidelines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• Ensure all personal information is verified before generation</li>
                      <li>• Photo and signature must be uploaded and validated</li>
                      <li>• Temporary cards are valid for 90 days</li>
                      <li>• Permanent cards are valid for 5 years</li>
                      <li>• Cards must be collected within 30 days of generation</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Recent ID Card Activities */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent ID Card Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">ID Card Generated</p>
                        <p className="text-xs text-gray-600">John Doe - SSN: 123456</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-green-600 font-medium">Generated</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Card Printed</p>
                        <p className="text-xs text-gray-600">Jane Smith - SSN: 789012</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-600 font-medium">Printed</p>
                        <p className="text-xs text-gray-500">1 day ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
