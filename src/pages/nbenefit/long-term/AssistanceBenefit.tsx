import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BenefitApplicationTable from "@/components/nbenefit/BenefitApplicationTable";
import { BENEFIT_APPLICATIONS } from "@/services/mockData/benefitApplications";

const AssistanceBenefit = () => {
  const navigate = useNavigate();

  const handleNewApplication = () => {
    navigate("/nbenefit/application/assistance");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Assistance Benefit (Contributory)</h1>
          <p className="text-muted-foreground mt-2">
            Manage assistance benefit applications for survivors and dependants
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
          <TabsTrigger value="dependency">Dependency Rules</TabsTrigger>
          <TabsTrigger value="calculation">Calculation Rules</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Assistance Benefit Overview</h3>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Who Qualifies?</h4>
                <p className="text-sm text-muted-foreground">
                  Assistance Benefit is a contributory benefit payable to widows, widowers, children, and dependent parents 
                  of deceased insured persons who meet the contribution requirements.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Widow/Widower</h4>
                  <p className="text-sm text-muted-foreground">
                    Spouse of deceased insured person
                  </p>
                </Card>
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Dependent Children</h4>
                  <p className="text-sm text-muted-foreground">
                    Under age 16 (or 18 if full-time student)
                  </p>
                </Card>
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Dependent Parents</h4>
                  <p className="text-sm text-muted-foreground">
                    Parents financially dependent on deceased
                  </p>
                </Card>
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Required Contributions</h4>
                  <p className="text-sm text-muted-foreground">
                    Deceased must have 150+ contribution weeks
                  </p>
                </Card>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Assistance Benefit Applications</h3>
              <Button onClick={handleNewApplication}>
                <Plus className="h-4 w-4 mr-2" />
                New Application
              </Button>
            </div>
            <BenefitApplicationTable 
              applications={BENEFIT_APPLICATIONS.filter(app => app.benefitType === "Assistance Benefit")}
            />
          </Card>
        </TabsContent>

        <TabsContent value="dependency">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Dependency & Relationship Rules</h3>
            <p className="text-muted-foreground">Dependency verification rules and relationship requirements will appear here.</p>
          </Card>
        </TabsContent>

        <TabsContent value="calculation">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Calculation Rules</h3>
            <p className="text-muted-foreground">Assistance benefit calculation formulas will appear here.</p>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reports</h3>
            <p className="text-muted-foreground">Assistance benefit reports will appear here.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssistanceBenefit;
