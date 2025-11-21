import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BenefitApplicationTable from "@/components/nbenefit/BenefitApplicationTable";
import { BENEFIT_APPLICATIONS } from "@/services/mockData/benefitApplications";

const InvalidityAssistance = () => {
  const navigate = useNavigate();

  const handleNewApplication = () => {
    navigate("/nbenefit/application/invalidity-assistance");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Invalidity Assistance (Non-Contributory)</h1>
          <p className="text-muted-foreground mt-2">
            Manage non-contributory invalidity assistance based on disability and need
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
          <TabsTrigger value="medical-means">Medical & Means Test</TabsTrigger>
          <TabsTrigger value="assessment">Assessment Workflow</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Invalidity Assistance Overview</h3>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">What is Invalidity Assistance?</h4>
                <p className="text-sm text-muted-foreground">
                  A non-contributory benefit provided to persons with permanent disabilities who are unable to work 
                  and do not qualify for contributory Invalidity Benefit. Requires both medical assessment and means test.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Age Requirement</h4>
                  <p className="text-sm text-muted-foreground">
                    Any age (under 62 for invalidity)
                  </p>
                </Card>
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Medical Requirement</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanent disability preventing work
                  </p>
                </Card>
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Financial Assessment</h4>
                  <p className="text-sm text-muted-foreground">
                    Means test required
                  </p>
                </Card>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Key Requirements:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Must be permanently unable to work due to physical or mental condition</li>
                  <li>Condition must have lasted at least 26 weeks</li>
                  <li>Medical board certification required</li>
                  <li>Must demonstrate financial need through means test</li>
                  <li>Does not qualify for contributory Invalidity Benefit</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Invalidity Assistance Applications</h3>
              <Button onClick={handleNewApplication}>
                <Plus className="h-4 w-4 mr-2" />
                New Application
              </Button>
            </div>
            <BenefitApplicationTable 
              applications={BENEFIT_APPLICATIONS.filter(app => app.benefitType === "Invalidity Assistance")}
            />
          </Card>
        </TabsContent>

        <TabsContent value="medical-means">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Medical & Means Test Rules</h3>
            <p className="text-muted-foreground">Medical assessment and means test criteria will appear here.</p>
          </Card>
        </TabsContent>

        <TabsContent value="assessment">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Assessment Workflow</h3>
            <p className="text-muted-foreground">Application assessment workflow will appear here.</p>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reports</h3>
            <p className="text-muted-foreground">Invalidity assistance reports will appear here.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvalidityAssistance;
