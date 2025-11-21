import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddRuleDialog } from "@/components/nbenefit/config/AddRuleDialog";
import { useState } from "react";

const CommonEligibilityRules = () => {
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [currentRuleType, setCurrentRuleType] = useState<"contribution" | "age" | "overlap" | "waiting">("contribution");

  const handleAddRule = (type: "contribution" | "age" | "overlap" | "waiting") => {
    setCurrentRuleType(type);
    setAddRuleOpen(true);
  };

  const handleSaveRule = (data: any) => {
    console.log("Saving rule:", data);
    // TODO: Implement actual save logic
  };
  // Mock data for contribution requirements
  const contributionRules = [
    {
      id: 1,
      benefitType: "Sickness Benefit",
      minContributions: 50,
      minContributionsPeriod: "At any time",
      recentContributions: 13,
      recentPeriod: "26 weeks before claim",
      waitingDays: 3,
      maxDuration: "26 weeks",
      status: "Active"
    },
    {
      id: 2,
      benefitType: "Maternity Benefit",
      minContributions: 50,
      minContributionsPeriod: "At any time",
      recentContributions: 26,
      recentPeriod: "52 weeks before expected delivery",
      waitingDays: 0,
      maxDuration: "13 weeks",
      status: "Active"
    },
    {
      id: 3,
      benefitType: "Employment Injury",
      minContributions: 1,
      minContributionsPeriod: "At time of accident",
      recentContributions: "N/A",
      recentPeriod: "N/A",
      waitingDays: 3,
      maxDuration: "52 weeks (or until recovery)",
      status: "Active"
    },
    {
      id: 4,
      benefitType: "Invalidity Benefit",
      minContributions: 150,
      minContributionsPeriod: "Total",
      recentContributions: 50,
      recentPeriod: "Last 3 years",
      waitingDays: 0,
      maxDuration: "Until age 62 or recovery",
      status: "Active"
    },
    {
      id: 5,
      benefitType: "Age Pension",
      minContributions: 500,
      minContributionsPeriod: "Total",
      recentContributions: "N/A",
      recentPeriod: "N/A",
      waitingDays: 0,
      maxDuration: "Lifetime",
      status: "Active"
    },
    {
      id: 6,
      benefitType: "Age Grant",
      minContributions: 50,
      minContributionsPeriod: "Total (less than 500)",
      recentContributions: "N/A",
      recentPeriod: "N/A",
      waitingDays: 0,
      maxDuration: "One-time payment",
      status: "Active"
    },
  ];

  const ageRequirements = [
    { benefitType: "Age Pension/Grant", minAge: 62, maxAge: "N/A", notes: "Must have attained age 62" },
    { benefitType: "Invalidity Benefit", minAge: "N/A", maxAge: 62, notes: "Must be under age 62 when invalidity begins" },
    { benefitType: "Survivors' Benefit", minAge: "Varies", maxAge: "N/A", notes: "Widow/Widower age-dependent; children under 16 or 18 if student" },
    { benefitType: "Maternity Benefit", minAge: 16, maxAge: "N/A", notes: "Must be of childbearing age" },
  ];

  const overlappingRules = [
    { rule: "Sickness + Maternity", allowed: false, reason: "Cannot claim both simultaneously" },
    { rule: "Sickness + Employment Injury", allowed: false, reason: "Only one short-term benefit at a time" },
    { rule: "Age Pension + Invalidity", allowed: false, reason: "Age pension replaces invalidity at age 62" },
    { rule: "Survivors' + Age Pension", allowed: true, reason: "Survivor can receive both if qualified" },
    { rule: "Funeral Grant + Other Benefits", allowed: true, reason: "One-time grant, no conflict" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Common Eligibility Rules</h1>
          <p className="text-muted-foreground mt-2">
            Configure contribution requirements, age thresholds, and eligibility criteria across all benefit types
          </p>
        </div>
        <Button onClick={() => handleAddRule("contribution")}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Rule
        </Button>
      </div>

      <Tabs defaultValue="contributions" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="contributions">Contribution Requirements</TabsTrigger>
          <TabsTrigger value="age">Age Requirements</TabsTrigger>
          <TabsTrigger value="overlapping">Overlapping Benefits</TabsTrigger>
          <TabsTrigger value="waiting">Waiting Periods</TabsTrigger>
        </TabsList>

        <TabsContent value="contributions">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Contribution Week Requirements by Benefit Type</h3>
                <p className="text-sm text-muted-foreground">
                  Based on St. Kitts & Nevis Social Security Act, 1977
                </p>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benefit Type</TableHead>
                    <TableHead>Minimum Contributions</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Recent Contributions</TableHead>
                    <TableHead>Recent Period</TableHead>
                    <TableHead>Waiting Days</TableHead>
                    <TableHead>Max Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributionRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.benefitType}</TableCell>
                      <TableCell>{rule.minContributions} weeks</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rule.minContributionsPeriod}</TableCell>
                      <TableCell>{rule.recentContributions === "N/A" ? "N/A" : `${rule.recentContributions} weeks`}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rule.recentPeriod}</TableCell>
                      <TableCell>{rule.waitingDays} days</TableCell>
                      <TableCell>{rule.maxDuration}</TableCell>
                      <TableCell>
                        <Badge variant="default">{rule.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleAddRule("contribution")}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Important Notes:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Contribution weeks are verified from the insured person's contribution history</li>
                  <li>Recent contributions must be within the specified period before the claim date</li>
                  <li>Waiting days do not count toward benefit payment period</li>
                  <li>Employment Injury requires only 1 contribution week as coverage is immediate</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="age">
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Age Thresholds by Benefit Type</h3>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benefit Type</TableHead>
                    <TableHead>Minimum Age</TableHead>
                    <TableHead>Maximum Age</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ageRequirements.map((req, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{req.benefitType}</TableCell>
                      <TableCell>{req.minAge}</TableCell>
                      <TableCell>{req.maxAge}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{req.notes}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleAddRule("age")}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="overlapping">
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Overlapping Benefit Rules</h3>
              <p className="text-sm text-muted-foreground">
                Configure which benefits can be claimed simultaneously
              </p>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benefit Combination</TableHead>
                    <TableHead>Allowed</TableHead>
                    <TableHead>Reason / Policy</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overlappingRules.map((rule, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{rule.rule}</TableCell>
                      <TableCell>
                        <Badge variant={rule.allowed ? "default" : "destructive"}>
                          {rule.allowed ? "Allowed" : "Not Allowed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{rule.reason}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleAddRule("overlap")}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="waiting">
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Waiting Periods Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Define waiting days before benefit payments begin
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Sickness Benefit</h4>
                  <div className="text-3xl font-bold text-primary mb-2">3 days</div>
                  <p className="text-sm text-muted-foreground">
                    No payment for first 3 days of incapacity
                  </p>
                </Card>

                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Employment Injury</h4>
                  <div className="text-3xl font-bold text-primary mb-2">3 days</div>
                  <p className="text-sm text-muted-foreground">
                    No payment for first 3 days after injury
                  </p>
                </Card>

                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Maternity Benefit</h4>
                  <div className="text-3xl font-bold text-primary mb-2">0 days</div>
                  <p className="text-sm text-muted-foreground">
                    Immediate payment upon approval
                  </p>
                </Card>

                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2">Invalidity Benefit</h4>
                  <div className="text-3xl font-bold text-primary mb-2">26 weeks</div>
                  <p className="text-sm text-muted-foreground">
                    Condition must persist for 26 weeks before qualifying
                  </p>
                </Card>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <AddRuleDialog
        open={addRuleOpen}
        onOpenChange={setAddRuleOpen}
        ruleType={currentRuleType}
        onSave={handleSaveRule}
      />
    </div>
  );
};

export default CommonEligibilityRules;
