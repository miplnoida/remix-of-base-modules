
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

const EmployerRules = () => {
  const navigate = useNavigate();

  const activeEmployerRules = [
    {
      category: "Registration Requirements",
      rules: [
        "Must register within 30 days of commencing business operations",
        "Minimum of 1 employee required for mandatory registration",
        "Annual turnover exceeding $50,000 requires immediate registration",
        "Must provide valid business license and tax registration"
      ]
    },
    {
      category: "Contribution Requirements",
      rules: [
        "Monthly contributions due by 15th of following month",
        "Employer contribution: 6% of employee's gross salary",
        "Employee contribution: 4% of gross salary (deducted by employer)",
        "Late payment penalty: 2% per month on outstanding amount"
      ]
    },
    {
      category: "Record Keeping",
      rules: [
        "Must maintain accurate payroll records for minimum 7 years",
        "Employee register must be updated within 7 days of changes",
        "Annual returns must be submitted by March 31st",
        "Records must be available for inspection by authorized officers"
      ]
    },
    {
      category: "Compliance Requirements",
      rules: [
        "Notify changes in business structure within 30 days",
        "Report work-related injuries within 48 hours",
        "Provide employee Social Security cards within 30 days of registration",
        "Display Social Security information poster at workplace"
      ]
    }
  ];

  const ceasedEmployerRules = [
    {
      category: "Voluntary Cessation",
      rules: [
        "Must provide 60 days written notice before cessation",
        "All outstanding contributions must be settled",
        "Final employee list and contribution statement required",
        "Certificate of cessation issued upon compliance"
      ]
    },
    {
      category: "Involuntary Cessation",
      rules: [
        "Business closure due to bankruptcy or legal action",
        "Immediate notification to Social Security Department",
        "Trustee/liquidator responsible for outstanding obligations",
        "Employee benefits protected under insolvency provisions"
      ]
    },
    {
      category: "Post-Cessation Obligations",
      rules: [
        "Final audit may be conducted within 12 months",
        "Records must be retained for 7 years post-cessation",
        "Outstanding penalties remain collectible",
        "Re-registration requires clearance certificate"
      ]
    }
  ];

  const penaltiesAndConsequences = [
    { violation: "Late Registration", penalty: "$500 + $50 per month delay", consequence: "Backdated contributions required" },
    { violation: "Late Contribution Payment", penalty: "2% per month on outstanding", consequence: "Interest compounds monthly" },
    { violation: "False Information", penalty: "$2,000 + criminal charges", consequence: "Registration may be revoked" },
    { violation: "Failure to Maintain Records", penalty: "$1,000 per violation", consequence: "Estimated assessments applied" },
    { violation: "Non-cooperation with Inspectors", penalty: "$1,500", consequence: "Forced compliance measures" }
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
                <span className="text-gray-900 font-medium">Employer Rules & Status</span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Employer Rules & Status Guidelines</h1>
          <p className="text-gray-600">Comprehensive guide to active and ceased employer rules and regulations</p>
        </div>

        <Alert className="mb-8">
          <Info className="h-4 w-4" />
          <AlertDescription>
            All employers must comply with these rules and regulations. Non-compliance may result in penalties, fines, or legal action.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active Employer Rules</TabsTrigger>
            <TabsTrigger value="ceased">Ceased Employer Rules</TabsTrigger>
            <TabsTrigger value="penalties">Penalties & Consequences</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {activeEmployerRules.map((section, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      {section.category}
                    </CardTitle>
                    <CardDescription>Rules and requirements for active employers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {section.rules.map((rule, ruleIndex) => (
                        <li key={ruleIndex} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm text-gray-700">{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ceased" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {ceasedEmployerRules.map((section, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      {section.category}
                    </CardTitle>
                    <CardDescription>Rules and procedures for ceased employers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {section.rules.map((rule, ruleIndex) => (
                        <li key={ruleIndex} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm text-gray-700">{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="penalties" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Penalties and Consequences
                </CardTitle>
                <CardDescription>Financial penalties and consequences for non-compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {penaltiesAndConsequences.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.violation}</h4>
                          <p className="text-sm text-gray-600 mt-1">{item.consequence}</p>
                        </div>
                        <Badge variant="destructive" className="ml-4">
                          {item.penalty}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> Penalties are cumulative and may result in criminal charges for serious violations. 
                All outstanding amounts are subject to collection through legal proceedings.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EmployerRules;
