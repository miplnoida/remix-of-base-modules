import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SurvivorsBenefit = () => {
  const navigate = useNavigate();

  const handleNewApplication = () => {
    navigate("/nbenefit/application/survivors");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Survivors' Benefit</h1>
          <p className="text-muted-foreground mt-2">
            Manage survivors' pension applications for widows, widowers, orphans, and dependent parents
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
          <TabsTrigger value="eligibility">Eligibility Rules</TabsTrigger>
          <TabsTrigger value="dependants">Dependants & Sharing Rules</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Survivors' Benefit Overview</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Eligibility</h4>
                  <p className="text-sm text-muted-foreground">
                    Deceased must have 500+ contributions or was receiving pension
                  </p>
                </Card>
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Benefit Rate</h4>
                  <p className="text-sm text-muted-foreground">
                    Based on deceased's pension entitlement
                  </p>
                </Card>
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Beneficiaries</h4>
                  <p className="text-sm text-muted-foreground">
                    Widow/widower: 50%, Orphans share: 50%
                  </p>
                </Card>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Who Can Receive Survivors' Benefit?</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li><strong>Widow/Widower:</strong> Surviving spouse receives 50% of deceased's pension</li>
                  <li><strong>Orphaned Children:</strong> Children under 16 (or 18 if full-time student) share 50%</li>
                  <li><strong>Dependent Parents:</strong> If no spouse or children, dependent parents may qualify</li>
                </ul>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Key Requirements:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Deceased must have qualified for Age Pension or Invalidity Benefit</li>
                  <li>Death certificate required</li>
                  <li>Proof of relationship (marriage certificate, birth certificates)</li>
                  <li>School certificate for student children over 16</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Survivors' Benefit Applications</h3>
              <Button onClick={handleNewApplication}>
                <Plus className="h-4 w-4 mr-2" />
                New Application
              </Button>
            </div>
            <p className="text-muted-foreground">List of survivors' benefit applications will appear here.</p>
          </Card>
        </TabsContent>

        <TabsContent value="eligibility">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Eligibility Rules</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <label className="text-sm font-medium">Deceased's Minimum Contributions</label>
                  <p className="text-2xl font-bold mt-2">500 weeks</p>
                </div>
                <div className="border rounded-lg p-4">
                  <label className="text-sm font-medium">Alternative</label>
                  <p className="text-2xl font-bold mt-2">Was receiving pension</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="dependants">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Dependants & Sharing Rules</h3>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Benefit Sharing Formula:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Widow/Widower receives 50% of deceased's pension</li>
                  <li>Orphaned children collectively share 50% of deceased's pension</li>
                  <li>If no widow/widower, orphans receive full 100%</li>
                  <li>Each child's share = 50% ÷ number of eligible children</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reports</h3>
            <p className="text-muted-foreground">Survivors' benefit reports will appear here.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SurvivorsBenefit;
