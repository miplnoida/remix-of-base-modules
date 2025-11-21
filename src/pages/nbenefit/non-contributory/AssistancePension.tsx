import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BenefitApplicationTable from "@/components/nbenefit/BenefitApplicationTable";
import { BENEFIT_APPLICATIONS } from "@/services/mockData/benefitApplications";

const AssistancePension = () => {
  const navigate = useNavigate();

  const handleNewApplication = () => {
    navigate("/nbenefit/application/assistance-pension");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Assistance Pension (Non-Contributory)</h1>
          <p className="text-muted-foreground mt-2">
            Manage non-contributory old age pension applications based on need and means test
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
          <TabsTrigger value="means-test">Means Test & Criteria</TabsTrigger>
          <TabsTrigger value="assessment">Assessment Workflow</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Assistance Pension Overview</h3>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">What is Assistance Pension?</h4>
                <p className="text-sm text-muted-foreground">
                  A non-contributory pension provided to elderly persons who are in need and do not qualify 
                  for a contributory Age Pension. This is a means-tested benefit based on financial need.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Age Requirement</h4>
                  <p className="text-sm text-muted-foreground">
                    62 years or older
                  </p>
                </Card>
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Means Test</h4>
                  <p className="text-sm text-muted-foreground">
                    Income and assets assessment required
                  </p>
                </Card>
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Monthly Amount</h4>
                  <p className="text-sm text-muted-foreground">
                    Based on means test result
                  </p>
                </Card>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Assistance Pension Applications</h3>
              <Button onClick={handleNewApplication}>
                <Plus className="h-4 w-4 mr-2" />
                New Application
              </Button>
            </div>
            <BenefitApplicationTable 
              applications={BENEFIT_APPLICATIONS.filter(app => app.benefitType === "Assistance Pension")}
            />
          </Card>
        </TabsContent>

        <TabsContent value="means-test">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Means Test & Need Criteria</h3>
            <p className="text-muted-foreground">Means test configuration and assessment criteria will appear here.</p>
          </Card>
        </TabsContent>

        <TabsContent value="assessment">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Assessment Workflow</h3>
            <p className="text-muted-foreground">Application assessment workflow and approval process will appear here.</p>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reports</h3>
            <p className="text-muted-foreground">Assistance pension reports will appear here.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssistancePension;
