
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Users, AlertCircle, CheckCircle } from 'lucide-react';

const InsuredPersonGuide = () => {
  const navigate = useNavigate();

  const citizenSteps = [
    { step: 1, title: "Document Preparation", description: "Gather required documents: Birth Certificate, National ID, Passport Photo" },
    { step: 2, title: "Application Form", description: "Complete the Insured Person Registration Form (Form SS-101)" },
    { step: 3, title: "Employer Verification", description: "Obtain employer verification letter and employment contract" },
    { step: 4, title: "Medical Examination", description: "Complete medical examination at approved facility (if required)" },
    { step: 5, title: "Submission", description: "Submit application with all documents to nearest Social Security office" },
    { step: 6, title: "Processing", description: "Application processed within 14 working days" },
    { step: 7, title: "ID Card Issuance", description: "Collect Social Security ID card upon approval" }
  ];

  const nonCitizenSteps = [
    { step: 1, title: "Document Preparation", description: "Gather required documents: Valid Passport, Work Permit, Visa, Passport Photo" },
    { step: 2, title: "Application Form", description: "Complete the Non-Citizen Registration Form (Form SS-102)" },
    { step: 3, title: "Work Authorization", description: "Provide valid work permit and labor department clearance" },
    { step: 4, title: "Employer Verification", description: "Obtain employer verification letter and employment contract" },
    { step: 5, title: "Medical Examination", description: "Complete comprehensive medical examination at designated facility" },
    { step: 6, title: "Submission", description: "Submit application with all documents to nearest Social Security office" },
    { step: 7, title: "Processing", description: "Application processed within 21 working days (extended for verification)" },
    { step: 8, title: "ID Card Issuance", description: "Collect Social Security ID card upon approval" }
  ];

  const requiredDocuments = {
    citizens: [
      "Birth Certificate (original and copy)",
      "National Identity Card (original and copy)",
      "Passport-size photographs (2 copies)",
      "Employment contract or verification letter",
      "Bank account details (for contributions)"
    ],
    nonCitizens: [
      "Valid passport (original and copy)",
      "Work permit (original and copy)",
      "Valid visa (original and copy)",
      "Passport-size photographs (2 copies)",
      "Employment contract or verification letter",
      "Medical certificate from approved facility",
      "Bank account details (for contributions)",
      "Labor department clearance letter"
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Registration Rules & Process</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Insured Person Registration</span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Insured Person Registration Guide</h1>
          <p className="text-gray-600">Step-by-step registration guide for citizens and non-citizens</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Citizens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-blue-600">7 Steps</p>
                <p className="text-sm text-gray-600">Processing time: 14 working days</p>
                <Badge variant="outline">Simplified Process</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                Non-Citizens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-green-600">8 Steps</p>
                <p className="text-sm text-gray-600">Processing time: 21 working days</p>
                <Badge variant="outline">Extended Verification</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Important
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">All documents must be original with certified copies</p>
                <p className="text-sm text-gray-600">Applications incomplete will be returned</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="citizens" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="citizens">Citizens Registration</TabsTrigger>
            <TabsTrigger value="non-citizens">Non-Citizens Registration</TabsTrigger>
            <TabsTrigger value="documents">Required Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="citizens" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Citizens Registration Process</CardTitle>
                <CardDescription>Follow these steps to register as an insured person (Citizens)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {citizenSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {step.step}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{step.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="non-citizens" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Non-Citizens Registration Process</CardTitle>
                <CardDescription>Follow these steps to register as an insured person (Non-Citizens)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {nonCitizenSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {step.step}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{step.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                    Citizens Documents
                  </CardTitle>
                  <CardDescription>Required documents for citizen registration</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {requiredDocuments.citizens.map((doc, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{doc}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Non-Citizens Documents
                  </CardTitle>
                  <CardDescription>Required documents for non-citizen registration</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {requiredDocuments.nonCitizens.map((doc, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{doc}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InsuredPersonGuide;
