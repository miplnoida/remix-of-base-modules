import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BenefitApplicationTable from "@/components/nbenefit/BenefitApplicationTable";
import { BENEFIT_APPLICATIONS } from "@/services/mockData/benefitApplications";

const EmploymentInjuryBenefit = () => {
  const navigate = useNavigate();

  const handleNewApplication = () => {
    navigate("/nbenefit/application/employment-injury");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Employment Injury Benefit</h1>
          <p className="text-muted-foreground mt-2">
            Manage employment injury claims, medical expenses, and disability assessments
          </p>
        </div>
        <Button onClick={handleNewApplication}>
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Overview & Rules</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="medical">Medical/Travel Expenses</TabsTrigger>
          <TabsTrigger value="disability">Disability Assessment</TabsTrigger>
          <TabsTrigger value="calculation">Calculation Rules</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Employment Injury Benefit Overview</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Eligibility</h4>
                  <p className="text-sm text-muted-foreground">
                    At least 1 contribution week at time of accident
                  </p>
                </Card>
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Benefit Rate</h4>
                  <p className="text-sm text-muted-foreground">
                    60% of Average Weekly Insurable Wages
                  </p>
                </Card>
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Maximum Duration</h4>
                  <p className="text-sm text-muted-foreground">
                    Up to 52 weeks or until recovery
                  </p>
                </Card>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">What is Employment Injury?</h4>
                <p className="text-sm text-muted-foreground">
                  An employment injury is a personal injury caused by accident arising out of and in the course of employment. 
                  This includes occupational diseases and injuries sustained while traveling to or from work on employer-provided transport.
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Covered Benefits:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Weekly injury benefit (60% of AWW)</li>
                  <li>Medical expenses reimbursement</li>
                  <li>Travel expenses for medical treatment</li>
                  <li>Disablement benefit (for permanent disability)</li>
                  <li>Constant attendance allowance (for severe disability)</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Employment Injury Applications</h3>
              <Button onClick={handleNewApplication}>
                <Plus className="h-4 w-4 mr-2" />
                New Application
              </Button>
            </div>
            <p className="text-muted-foreground">List of employment injury benefit applications will appear here.</p>
          </Card>
        </TabsContent>

        <TabsContent value="medical">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Medical & Travel Expenses</h3>
            <p className="text-muted-foreground">Medical and travel expense claims for employment injuries will appear here.</p>
          </Card>
        </TabsContent>

        <TabsContent value="disability">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Disability Assessment</h3>
            <p className="text-muted-foreground">Disability assessments and disablement benefit calculations will appear here.</p>
          </Card>
        </TabsContent>

        <TabsContent value="calculation">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Calculation Rules</h3>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Weekly Injury Benefit Formula:</h4>
                <p className="font-mono text-sm">Benefit = 60% × Average Weekly Wage (last 13 weeks)</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Minimum Weekly Benefit</h4>
                  <p className="text-2xl font-bold text-primary">XCD 36.00</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Maximum Weekly Benefit</h4>
                  <p className="text-2xl font-bold text-primary">XCD 300.00</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reports</h3>
            <p className="text-muted-foreground">Employment injury reports and statistics will appear here.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmploymentInjuryBenefit;
