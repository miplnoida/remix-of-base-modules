
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, FileText, Users, Building2 } from 'lucide-react';

const ApprovalWorkflow = () => {
  const navigate = useNavigate();

  const employerWorkflow = [
    {
      stage: "Application Submission",
      duration: "Day 1",
      status: "received",
      description: "Employer submits registration application with required documents",
      responsible: "Applicant",
      requirements: ["Completed application form", "Business license", "Tax registration", "Bank details"]
    },
    {
      stage: "Initial Review",
      duration: "Days 2-3",
      status: "processing",
      description: "Registration officer reviews application for completeness",
      responsible: "Registration Officer",
      requirements: ["Document verification", "Completeness check", "Initial assessment"]
    },
    {
      stage: "Field Inspection",
      duration: "Days 4-7",
      status: "pending",
      description: "Compliance officer conducts on-site inspection of business premises",
      responsible: "Compliance Officer",
      requirements: ["Physical address verification", "Business operation assessment", "Employee verification"]
    },
    {
      stage: "Technical Review",
      duration: "Days 8-10",
      status: "pending",
      description: "Technical team reviews business classification and contribution structure",
      responsible: "Technical Team",
      requirements: ["Industry classification", "Contribution calculation", "Risk assessment"]
    },
    {
      stage: "Supervisor Approval",
      duration: "Days 11-12",
      status: "pending",
      description: "Department supervisor reviews and approves/rejects application",
      responsible: "Department Supervisor",
      requirements: ["Final review", "Approval decision", "Conditions setting"]
    },
    {
      stage: "Registration Completion",
      duration: "Days 13-14",
      status: "pending",
      description: "Employer registration number assigned and certificate issued",
      responsible: "Registration Team",
      requirements: ["ID number assignment", "Certificate generation", "Welcome package preparation"]
    }
  ];

  const personWorkflow = [
    {
      stage: "Application Submission",
      duration: "Day 1",
      status: "received",
      description: "Individual submits registration application with required documents",
      responsible: "Applicant",
      requirements: ["Completed application form", "Identity documents", "Employment verification", "Medical certificate (if required)"]
    },
    {
      stage: "Document Verification",
      duration: "Days 2-4",
      status: "processing",
      description: "Registration officer verifies all submitted documents",
      responsible: "Registration Officer",
      requirements: ["Identity verification", "Document authentication", "Employer verification"]
    },
    {
      stage: "Eligibility Assessment",
      duration: "Days 5-7",
      status: "pending",
      description: "Assessment of eligibility criteria and contribution requirements",
      responsible: "Assessment Officer",
      requirements: ["Age verification", "Employment status check", "Contribution calculation"]
    },
    {
      stage: "Medical Review",
      duration: "Days 8-10",
      status: "pending",
      description: "Medical examination review (for certain categories)",
      responsible: "Medical Officer",
      requirements: ["Medical certificate review", "Health assessment", "Fitness determination"]
    },
    {
      stage: "Final Approval",
      duration: "Days 11-12",
      status: "pending",
      description: "Final approval and ID card preparation",
      responsible: "Approval Officer",
      requirements: ["Final eligibility check", "Approval decision", "Card preparation"]
    },
    {
      stage: "ID Card Issuance",
      duration: "Days 13-14",
      status: "pending",
      description: "Social Security ID card issued to insured person",
      responsible: "Card Issuance Team",
      requirements: ["Card printing", "Quality check", "Delivery arrangement"]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return <Badge variant="default">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
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
                <span className="text-gray-900 font-medium">Approval Workflow</span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Internal Approval Workflow Overview</h1>
          <p className="text-gray-600">Detailed workflow for employer and insured person registration approvals</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Employer Workflow */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  Employer Registration Workflow
                </CardTitle>
                <CardDescription>14-day approval process for employer registration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {employerWorkflow.map((step, index) => (
                    <div key={index} className="relative">
                      {index < employerWorkflow.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
                      )}
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center">
                          {getStatusIcon(step.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">{step.stage}</h3>
                            {getStatusBadge(step.status)}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{step.duration} • {step.responsible}</p>
                          <p className="text-sm text-gray-600 mt-2">{step.description}</p>
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 font-medium">Requirements:</p>
                            <ul className="text-xs text-gray-500 mt-1 space-y-1">
                              {step.requirements.map((req, reqIndex) => (
                                <li key={reqIndex} className="flex items-center gap-1">
                                  <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0"></div>
                                  {req}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insured Person Workflow */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  Insured Person Registration Workflow
                </CardTitle>
                <CardDescription>14-day approval process for insured person registration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {personWorkflow.map((step, index) => (
                    <div key={index} className="relative">
                      {index < personWorkflow.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
                      )}
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center">
                          {getStatusIcon(step.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">{step.stage}</h3>
                            {getStatusBadge(step.status)}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{step.duration} • {step.responsible}</p>
                          <p className="text-sm text-gray-600 mt-2">{step.description}</p>
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 font-medium">Requirements:</p>
                            <ul className="text-xs text-gray-500 mt-1 space-y-1">
                              {step.requirements.map((req, reqIndex) => (
                                <li key={reqIndex} className="flex items-center gap-1">
                                  <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0"></div>
                                  {req}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Processing Times</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Standard processing: 14 working days</li>
                  <li>• Expedited processing: 7 working days (additional fee)</li>
                  <li>• Complex cases: Up to 21 working days</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Application Status</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Applicants can track status online</li>
                  <li>• SMS notifications sent at each stage</li>
                  <li>• Email updates for significant changes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApprovalWorkflow;
