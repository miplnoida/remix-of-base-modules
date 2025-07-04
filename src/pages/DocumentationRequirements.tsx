
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle, AlertCircle, Building2, Users, UserCheck } from 'lucide-react';

const DocumentationRequirements = () => {
  const navigate = useNavigate();

  const employerDocuments = [
    {
      category: "Business Registration",
      required: true,
      documents: [
        { name: "Business License", type: "Original + Copy", notes: "Valid and current" },
        { name: "Certificate of Incorporation", type: "Certified Copy", notes: "For corporations" },
        { name: "Partnership Agreement", type: "Certified Copy", notes: "For partnerships" },
        { name: "Tax Registration Certificate", type: "Original + Copy", notes: "From tax authority" }
      ]
    },
    {
      category: "Financial Information",
      required: true,
      documents: [
        { name: "Bank Account Details", type: "Bank Letter", notes: "For contribution payments" },
        { name: "Financial Statements", type: "Certified Copy", notes: "Last 2 years" },
        { name: "Auditor's Report", type: "Original", notes: "If applicable" },
        { name: "Tax Clearance Certificate", type: "Original", notes: "Current year" }
      ]
    },
    {
      category: "Operational Details",
      required: true,
      documents: [
        { name: "Employee List", type: "Typed List", notes: "With full names and positions" },
        { name: "Payroll Records", type: "Copies", notes: "Last 3 months" },
        { name: "Office Lease Agreement", type: "Copy", notes: "Proof of business address" },
        { name: "Organizational Chart", type: "Diagram", notes: "Management structure" }
      ]
    }
  ];

  const personDocuments = [
    {
      category: "Citizens",
      documents: [
        { name: "Birth Certificate", type: "Original + Copy", notes: "Government issued", required: true },
        { name: "National Identity Card", type: "Original + Copy", notes: "Valid ID", required: true },
        { name: "Passport Photos", type: "2 copies", notes: "Recent, colored", required: true },
        { name: "Employment Contract", type: "Copy", notes: "Signed by employer", required: true },
        { name: "Bank Account Details", type: "Bank Letter", notes: "For benefit payments", required: false }
      ]
    },
    {
      category: "Non-Citizens",
      documents: [
        { name: "Valid Passport", type: "Original + Copy", notes: "Must be current", required: true },
        { name: "Work Permit", type: "Original + Copy", notes: "Valid work authorization", required: true },
        { name: "Valid Visa", type: "Original + Copy", notes: "Appropriate visa type", required: true },
        { name: "Passport Photos", type: "2 copies", notes: "Recent, colored", required: true },
        { name: "Employment Contract", type: "Copy", notes: "Signed by employer", required: true },
        { name: "Medical Certificate", type: "Original", notes: "From approved facility", required: true },
        { name: "Labor Clearance", type: "Original", notes: "From labor department", required: true },
        { name: "Bank Account Details", type: "Bank Letter", notes: "For benefit payments", required: false }
      ]
    }
  ];

  const selfEmployedDocuments = [
    {
      category: "Personal Documents",
      required: true,
      documents: [
        { name: "Birth Certificate or Passport", type: "Original + Copy", notes: "Proof of identity" },
        { name: "National ID or Work Permit", type: "Original + Copy", notes: "Valid identification" },
        { name: "Passport Photos", type: "2 copies", notes: "Recent, colored" },
        { name: "Address Proof", type: "Copy", notes: "Utility bill or lease" }
      ]
    },
    {
      category: "Business Documents",
      required: true,
      documents: [
        { name: "Business Registration", type: "Copy", notes: "If formally registered" },
        { name: "Tax Registration", type: "Copy", notes: "Tax identification number" },
        { name: "Business License", type: "Copy", notes: "If required for business type" },
        { name: "Professional Certificates", type: "Copy", notes: "If applicable" }
      ]
    },
    {
      category: "Financial Documents",
      required: false,
      documents: [
        { name: "Bank Statements", type: "Copy", notes: "Last 3 months" },
        { name: "Income Declaration", type: "Sworn Statement", notes: "Estimated annual income" },
        { name: "Business Plan", type: "Copy", notes: "For new businesses" },
        { name: "Financial Projections", type: "Copy", notes: "If available" }
      ]
    }
  ];

  const documentGuidelines = [
    {
      title: "Document Authenticity",
      points: [
        "All original documents must be presented for verification",
        "Copies must be certified by authorized personnel",
        "Foreign documents must be translated and authenticated",
        "Altered or fraudulent documents will result in application rejection"
      ]
    },
    {
      title: "Submission Requirements",
      points: [
        "Documents must be submitted in person or by authorized representative",
        "Incomplete applications will be returned without processing",
        "Additional documents may be requested during review process",
        "All documents become property of Social Security Department"
      ]
    },
    {
      title: "Processing Guidelines",
      points: [
        "Document verification takes 3-5 working days",
        "Applicants will be notified of any missing documents",
        "Original documents will be returned after verification",
        "Certified copies will be retained in application file"
      ]
    }
  ];

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
                <span className="text-gray-900 font-medium">Documentation Requirements</span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Documentation Requirements</h1>
          <p className="text-gray-600">Required documents for different registration types and processes</p>
        </div>

        <Alert className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> All documents must be original with certified copies. Incomplete applications will be returned without processing.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="employers" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="employers">Employers</TabsTrigger>
            <TabsTrigger value="persons">Insured Persons</TabsTrigger>
            <TabsTrigger value="self-employed">Self-Employed</TabsTrigger>
            <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
          </TabsList>

          <TabsContent value="employers" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {employerDocuments.map((category, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-500" />
                      {category.category}
                      {category.required && <Badge variant="destructive">Required</Badge>}
                    </CardTitle>
                    <CardDescription>Documents required for employer registration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {category.documents.map((doc, docIndex) => (
                        <div key={docIndex} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="font-medium text-gray-900">{doc.name}</p>
                              <p className="text-sm text-gray-500">{doc.notes}</p>
                            </div>
                          </div>
                          <Badge variant="outline">{doc.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="persons" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {personDocuments.map((category, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-500" />
                      {category.category}
                    </CardTitle>
                    <CardDescription>Required documents for {category.category.toLowerCase()} registration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {category.documents.map((doc, docIndex) => (
                        <div key={docIndex} className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className="flex-shrink-0 mt-1">
                            {doc.required ? (
                              <CheckCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900">{doc.name}</p>
                              <Badge variant={doc.required ? "destructive" : "outline"}>
                                {doc.required ? "Required" : "Optional"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{doc.notes}</p>
                            <p className="text-xs text-gray-400 mt-1">{doc.type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="self-employed" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {selfEmployedDocuments.map((category, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-purple-500" />
                      {category.category}
                      {category.required && <Badge variant="destructive">Required</Badge>}
                    </CardTitle>
                    <CardDescription>Documents required for self-employed registration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {category.documents.map((doc, docIndex) => (
                        <div key={docIndex} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="font-medium text-gray-900">{doc.name}</p>
                              <p className="text-sm text-gray-500">{doc.notes}</p>
                            </div>
                          </div>
                          <Badge variant="outline">{doc.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="guidelines" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {documentGuidelines.map((guideline, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      {guideline.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {guideline.points.map((point, pointIndex) => (
                        <li key={pointIndex} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm text-gray-700">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DocumentationRequirements;
