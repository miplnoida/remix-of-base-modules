import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BenefitApplicationTable from "@/components/nbenefit/BenefitApplicationTable";
import { BENEFIT_APPLICATIONS } from "@/services/mockData/benefitApplications";

const InvalidityBenefit = () => {
  const navigate = useNavigate();

  const handleNewApplication = () => {
    navigate("/nbenefit/application/invalidity");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Invalidity Benefit</h1>
          <p className="text-muted-foreground mt-2">
            Manage invalidity benefit applications and medical assessments
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
          <TabsTrigger value="medical">Medical Assessment</TabsTrigger>
          <TabsTrigger value="eligibility">Eligibility Rules</TabsTrigger>
          <TabsTrigger value="calculation">Calculation Rules</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Invalidity Benefit Overview</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Eligibility</h4>
                  <p className="text-sm text-muted-foreground">
                    150 total contributions, 50 in last 3 years, under age 62
                  </p>
                </Card>
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Benefit Rate</h4>
                  <p className="text-sm text-muted-foreground">
                    30% of AWW + 1% per 50 contribution weeks
                  </p>
                </Card>
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Duration</h4>
                  <p className="text-sm text-muted-foreground">
                    Until age 62 or recovery (converts to Age Pension at 62)
                  </p>
                </Card>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">What is Invalidity?</h4>
                <p className="text-sm text-muted-foreground">
                  Invalidity refers to a permanent or long-lasting state of physical or mental incapacity 
                  that prevents the insured person from working. The condition must have persisted for at 
                  least 26 weeks and be likely to be permanent.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Invalidity Benefit Applications</h3>
              <Button onClick={handleNewApplication}>
                <Plus className="h-4 w-4 mr-2" />
                New Application
              </Button>
            </div>
            <BenefitApplicationTable 
              applications={BENEFIT_APPLICATIONS.filter(app => app.benefitType === "Invalidity Benefit")}
            />
          </Card>
        </TabsContent>

        <TabsContent value="medical">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Medical Assessment Management</h3>
            <p className="text-muted-foreground">Medical assessments and board opinions will appear here.</p>
          </Card>
        </TabsContent>

        <TabsContent value="eligibility">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Eligibility Rules</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <label className="text-sm font-medium">Total Contributions Required</label>
                  <p className="text-2xl font-bold mt-2">150 weeks</p>
                </div>
                <div className="border rounded-lg p-4">
                  <label className="text-sm font-medium">Recent Contributions</label>
                  <p className="text-2xl font-bold mt-2">50 weeks in 3 years</p>
                </div>
                <div className="border rounded-lg p-4">
                  <label className="text-sm font-medium">Maximum Age</label>
                  <p className="text-2xl font-bold mt-2">Under 62</p>
                </div>
                <div className="border rounded-lg p-4">
                  <label className="text-sm font-medium">Condition Duration</label>
                  <p className="text-2xl font-bold mt-2">26+ weeks</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="calculation">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Calculation Rules</h3>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Invalidity Pension Formula:</h4>
                <p className="font-mono text-sm">Benefit = 30% × AWW + 1% × (contributions ÷ 50)</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Minimum Monthly Benefit</h4>
                  <p className="text-2xl font-bold text-primary">XCD 260.00</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Maximum Monthly Benefit</h4>
                  <p className="text-2xl font-bold text-primary">XCD 1,500.00</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reports</h3>
            <p className="text-muted-foreground">Invalidity benefit reports will appear here.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvalidityBenefit;
