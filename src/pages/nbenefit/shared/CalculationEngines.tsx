import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Calculator } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddCalculationDialog } from "@/components/nbenefit/_legacy/AddCalculationDialog";
import { useState } from "react";

const CalculationEngines = () => {
  const [addCalculationOpen, setAddCalculationOpen] = useState(false);
  const [currentCalculationType, setCurrentCalculationType] = useState<"short-term" | "long-term" | "indexation">("short-term");
  const [editData, setEditData] = useState<any>(null);

  const handleAddCalculation = (type: "short-term" | "long-term" | "indexation") => {
    setEditData(null);
    setCurrentCalculationType(type);
    setAddCalculationOpen(true);
  };

  const handleEditCalculation = (data: any, type: "short-term" | "long-term" | "indexation") => {
    setEditData(data);
    setCurrentCalculationType(type);
    setAddCalculationOpen(true);
  };

  const handleSaveCalculation = (data: any) => {
    console.log("Saving calculation:", data);
    setEditData(null);
    // TODO: Implement actual save logic
  };
  const shortTermCalculations = [
    {
      benefit: "Sickness Benefit",
      formula: "60% of Average Weekly Insurable Wages",
      minWeekly: "XCD 36.00",
      maxWeekly: "XCD 300.00",
      maxFormula: "MIN(0.60 * AWE, 300)",
      duration: "Up to 26 weeks",
      notes: "Based on best 13 weeks in last 26 weeks"
    },
    {
      benefit: "Employment Injury",
      formula: "60% of Average Weekly Insurable Wages",
      minWeekly: "XCD 36.00",
      maxWeekly: "XCD 300.00",
      maxFormula: "MIN(0.60 * AWE, 300)",
      duration: "Up to 52 weeks",
      notes: "Based on average of last 13 weeks"
    },
    {
      benefit: "Maternity Allowance",
      formula: "65% of Average Weekly Insurable Wages",
      minWeekly: "XCD 39.00",
      maxWeekly: "XCD 325.00",
      maxFormula: "MIN(0.65 * AWE, 325)",
      duration: "13 weeks",
      notes: "6 weeks before and 7 weeks after delivery"
    },
    {
      benefit: "Maternity Grant",
      formula: "Fixed lump sum",
      minWeekly: "N/A",
      maxWeekly: "N/A",
      maxFormula: "600",
      duration: "One-time",
      notes: "XCD 600 per child"
    },
    {
      benefit: "Funeral Grant",
      formula: "Fixed lump sum",
      minWeekly: "N/A",
      maxWeekly: "N/A",
      maxFormula: "MAX(2500, 1250)",
      duration: "One-time",
      notes: "XCD 2,500 for insured; XCD 1,250 for dependant"
    },
  ];

  const longTermCalculations = [
    {
      benefit: "Age Pension",
      formula: "30% of AWW + 1% × (contributions - 500)",
      minMonthly: "XCD 260.00",
      maxMonthly: "XCD 1,500.00",
      maxFormula: "MIN((0.30 * AWW) + (0.01 * (TotalContrib - 500)), 1500)",
      notes: "Requires 500+ contributions"
    },
    {
      benefit: "Age Grant",
      formula: "6 × AWW × (contributions ÷ 50)",
      minAmount: "Based on contributions",
      maxAmount: "No maximum",
      maxFormula: "6 * AWW * (TotalContrib / 50)",
      notes: "For those with 50-499 contributions"
    },
    {
      benefit: "Invalidity Benefit",
      formula: "30% of AWW + 1% × contributions",
      minMonthly: "XCD 260.00",
      maxMonthly: "XCD 1,500.00",
      maxFormula: "MIN((0.30 * AWW) + (0.01 * TotalContrib), 1500)",
      notes: "Requires 150+ contributions"
    },
    {
      benefit: "Survivors' Pension",
      formula: "Based on deceased's pension rate",
      minMonthly: "XCD 195.00",
      maxMonthly: "Based on deceased",
      maxFormula: "MIN(DeceasedPensionRate * Percentage, DeceasedMax)",
      notes: "Widow/widower: 50%; orphans share 50%"
    },
  ];

  const indexationRates = [
    { year: 2024, rate: "2.5%", effectiveDate: "January 1, 2024", status: "Active" },
    { year: 2023, rate: "2.3%", effectiveDate: "January 1, 2023", status: "Historical" },
    { year: 2022, rate: "2.0%", effectiveDate: "January 1, 2022", status: "Historical" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Benefit Calculation Engines</h1>
          <p className="text-muted-foreground mt-2">
            Configure formulas, rates, and calculation methods for all benefit types
          </p>
        </div>
        <Button onClick={() => handleAddCalculation("short-term")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Calculation Rule
        </Button>
      </div>

      <Tabs defaultValue="short-term" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="short-term">Short-Term Benefits</TabsTrigger>
          <TabsTrigger value="long-term">Long-Term Benefits</TabsTrigger>
          <TabsTrigger value="aww">Average Weekly Wage</TabsTrigger>
          <TabsTrigger value="indexation">Indexation & Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="short-term">
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Short-Term Benefit Calculation Rules</h3>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benefit Type</TableHead>
                    <TableHead>Calculation Formula</TableHead>
                    <TableHead>Min Weekly</TableHead>
                    <TableHead>Max Weekly</TableHead>
                    <TableHead>Max Formula</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shortTermCalculations.map((calc, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{calc.benefit}</TableCell>
                      <TableCell className="font-mono text-sm">{calc.formula}</TableCell>
                      <TableCell>{calc.minWeekly}</TableCell>
                      <TableCell>{calc.maxWeekly}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{calc.maxFormula}</TableCell>
                      <TableCell>{calc.duration}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{calc.notes}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditCalculation(calc, "short-term")}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="long-term">
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Long-Term Benefit Calculation Rules</h3>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benefit Type</TableHead>
                    <TableHead>Calculation Formula</TableHead>
                    <TableHead>Min Monthly</TableHead>
                    <TableHead>Max Monthly</TableHead>
                    <TableHead>Max Formula</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {longTermCalculations.map((calc, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{calc.benefit}</TableCell>
                      <TableCell className="font-mono text-sm">{calc.formula}</TableCell>
                      <TableCell>{calc.minMonthly || calc.minAmount}</TableCell>
                      <TableCell>{calc.maxMonthly || calc.maxAmount}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{calc.maxFormula}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{calc.notes}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditCalculation(calc, "long-term")}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="aww">
          <Card className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Average Weekly Wage (AWW) Calculation</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4 border-2 border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Standard AWW Formula</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-background rounded-lg border">
                      <p className="text-sm font-medium mb-1">For Short-Term Benefits:</p>
                      <p className="font-mono text-sm">AWW = Total Insurable Wages ÷ Number of Contribution Weeks</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Based on best 13 weeks in the 26 weeks before claim
                      </p>
                    </div>
                    
                    <div className="p-3 bg-background rounded-lg border">
                      <p className="text-sm font-medium mb-1">For Long-Term Benefits:</p>
                      <p className="font-mono text-sm">AWW = Total Insurable Wages ÷ Total Contribution Weeks</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Based on entire contribution history
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-4">Insurable Wage Limits</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Minimum Insurable Wage</span>
                      <span className="font-bold">XCD 60.00/week</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Maximum Insurable Wage</span>
                      <span className="font-bold">XCD 500.00/week</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Last Updated</span>
                      <span className="text-sm text-muted-foreground">January 1, 2024</span>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Calculation Rules:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Only insurable wages within min/max limits are counted</li>
                  <li>Weeks with zero contributions are excluded from AWW calculation</li>
                  <li>AWW is rounded to the nearest cent (XCD 0.01)</li>
                  <li>For employment injury, use wages from the 13 weeks immediately before accident</li>
                  <li>For maternity, use best 13 weeks in the 52 weeks before expected delivery</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="indexation">
          <Card className="p-6">
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Indexation Rates & Benefit Adjustments</h3>
                  <Button onClick={() => handleAddCalculation("indexation")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Rate
                  </Button>
                </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Indexation Rate</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indexationRates.map((rate, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{rate.year}</TableCell>
                      <TableCell className="text-lg font-bold text-primary">{rate.rate}</TableCell>
                      <TableCell>{rate.effectiveDate}</TableCell>
                      <TableCell>
                        <Badge variant={rate.status === "Active" ? "default" : "secondary"}>
                          {rate.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        All long-term benefits
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditCalculation(rate, "indexation")}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2 text-sm">Current Minimum Pension</h4>
                  <div className="text-2xl font-bold text-primary">XCD 260/mo</div>
                  <p className="text-xs text-muted-foreground mt-1">Effective Jan 2024</p>
                </Card>

                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2 text-sm">Current Maximum Pension</h4>
                  <div className="text-2xl font-bold text-primary">XCD 1,500/mo</div>
                  <p className="text-xs text-muted-foreground mt-1">Effective Jan 2024</p>
                </Card>

                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-2 text-sm">Next Review Date</h4>
                  <div className="text-2xl font-bold text-primary">Jan 2025</div>
                  <p className="text-xs text-muted-foreground mt-1">Annual review</p>
                </Card>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <AddCalculationDialog
        open={addCalculationOpen}
        onOpenChange={setAddCalculationOpen}
        calculationType={currentCalculationType}
        onSave={handleSaveCalculation}
      />
    </div>
  );
};

export default CalculationEngines;
