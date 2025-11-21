import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BenefitApplicationTable from "@/components/nbenefit/BenefitApplicationTable";
import { BENEFIT_APPLICATIONS } from "@/services/mockData/benefitApplications";

const FuneralGrantBenefit = () => {
  const navigate = useNavigate();

  const handleNewApplication = () => {
    navigate("/nbenefit/application/funeral-grant");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Funeral Grant</h1>
          <p className="text-muted-foreground mt-2">
            Manage funeral grant applications for deceased insured persons and dependants
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
          <TabsTrigger value="rules">Eligibility & Amount Rules</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Funeral Grant Overview</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 border-2 border-primary/20 bg-primary/5">
                  <h4 className="font-semibold mb-2">For Deceased Insured Person</h4>
                  <div className="text-3xl font-bold text-primary mb-2">XCD 2,500</div>
                  <p className="text-sm text-muted-foreground">
                    Minimum 50 contribution weeks required
                  </p>
                </Card>
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">For Deceased Dependant</h4>
                  <div className="text-3xl font-bold text-primary mb-2">XCD 1,250</div>
                  <p className="text-sm text-muted-foreground">
                    Spouse or child of insured person
                  </p>
                </Card>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">What is a Funeral Grant?</h4>
                <p className="text-sm text-muted-foreground">
                  A funeral grant is a one-time lump sum payment made to help cover funeral expenses when an insured person 
                  or their dependant (spouse or child) dies. The grant is paid to the person who bears the cost of the funeral.
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Eligibility Requirements:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>For insured person: At least 50 contribution weeks at any time</li>
                  <li>For dependant: Insured person must have at least 50 contribution weeks</li>
                  <li>Application must be made within 3 months of death</li>
                  <li>Death certificate must be provided</li>
                  <li>Proof of funeral expenses may be required</li>
                </ul>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Who Can Apply:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>The person who paid for the funeral expenses</li>
                  <li>Next of kin (spouse, child, parent, or other relative)</li>
                  <li>Legal representative of the estate</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Funeral Grant Applications</h3>
              <Button onClick={handleNewApplication}>
                <Plus className="h-4 w-4 mr-2" />
                New Application
              </Button>
            </div>
            <p className="text-muted-foreground">List of funeral grant applications will appear here.</p>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Eligibility & Amount Rules</h3>
            <div className="space-y-4">
              <Card className="p-4 border">
                <h4 className="font-semibold mb-3">Grant Amounts (Fixed)</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Insured Person Dies</span>
                    <span className="text-lg font-bold text-primary">XCD 2,500.00</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Spouse of Insured Dies</span>
                    <span className="text-lg font-bold text-primary">XCD 1,250.00</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Child of Insured Dies</span>
                    <span className="text-lg font-bold text-primary">XCD 1,250.00</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border">
                <h4 className="font-semibold mb-3">Required Documents</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Completed funeral grant application form</li>
                  <li>Original death certificate</li>
                  <li>Copy of applicant's ID</li>
                  <li>Proof of relationship (for dependant claims)</li>
                  <li>Funeral receipts (if requested)</li>
                  <li>Bank account details for payment</li>
                </ul>
              </Card>

              <Card className="p-4 border">
                <h4 className="font-semibold mb-3">Processing Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>Application Review</span>
                    <span className="text-muted-foreground">1-2 days</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>Contribution Verification</span>
                    <span className="text-muted-foreground">1-2 days</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>Approval & Payment Setup</span>
                    <span className="text-muted-foreground">2-3 days</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-primary/10 rounded font-semibold">
                    <span>Total Target</span>
                    <span className="text-primary">5-7 days</span>
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reports</h3>
            <p className="text-muted-foreground">Funeral grant reports and statistics will appear here.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FuneralGrantBenefit;
