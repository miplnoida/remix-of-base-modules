import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calculator, Plus, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";
import { levySettingsService } from "@/services/levySettingsService";
import {
  LevyScheme,
  LevySimulatorInput,
  LevySimulatorOutput,
  PeriodType,
  MaritalStatus,
  EmploymentType
} from "@/types/levySettings";

export default function LevySimulator() {
  const navigate = useNavigate();
  
  const [schemes, setSchemes] = useState<LevyScheme[]>([]);
  const [input, setInput] = useState<LevySimulatorInput>({
    schemeId: null,
    payDate: new Date().toISOString().split('T')[0],
    periodType: 'Weekly',
    employeeAge: 30,
    maritalStatus: 'Single',
    employmentType: 'PERM',
    earningsComponents: [
      { componentCode: 'BASIC', componentName: 'Basic Salary', amount: 1000 }
    ]
  });

  const [output, setOutput] = useState<LevySimulatorOutput | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSchemes();
  }, []);

  const loadSchemes = async () => {
    try {
      const data = await levySettingsService.getLevySchemes({ status: 'Active' });
      setSchemes(data);
    } catch (error) {
      toast.error("Failed to load schemes");
    }
  };

  const handleAddComponent = () => {
    setInput({
      ...input,
      earningsComponents: [
        ...input.earningsComponents,
        { componentCode: '', componentName: '', amount: 0 }
      ]
    });
  };

  const handleRemoveComponent = (index: number) => {
    setInput({
      ...input,
      earningsComponents: input.earningsComponents.filter((_, i) => i !== index)
    });
  };

  const handleComponentChange = (index: number, field: string, value: any) => {
    const updated = [...input.earningsComponents];
    updated[index] = { ...updated[index], [field]: value };
    setInput({ ...input, earningsComponents: updated });
  };

  const handleRunSimulation = async () => {
    setLoading(true);
    try {
      const result = await levySettingsService.runLevySimulation(input);
      setOutput(result);
      toast.success("Simulation completed successfully");
    } catch (error) {
      toast.error("Failed to run simulation");
    } finally {
      setLoading(false);
    }
  };

  const totalEarnings = input.earningsComponents.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/c3-management/settings/levy/schemes")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-8 w-8 text-primary" />
              Levy Simulator / Test Tool
            </h1>
            <p className="text-muted-foreground mt-1">
              Test levy calculations with different scenarios and rules
            </p>
          </div>
        </div>
        <Button onClick={handleRunSimulation} disabled={loading}>
          <Calculator className="h-4 w-4 mr-2" />
          Run Simulation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Simulation Parameters</CardTitle>
              <CardDescription>
                Configure the test scenario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Levy Scheme</Label>
                <Select
                  value={input.schemeId || 'current'}
                  onValueChange={(value) => setInput({ ...input, schemeId: value === 'current' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current/Active Scheme</SelectItem>
                    {schemes.map((scheme) => (
                      <SelectItem key={scheme.schemeId} value={scheme.schemeId}>
                        {scheme.schemeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pay Date</Label>
                  <Input
                    type="date"
                    value={input.payDate}
                    onChange={(e) => setInput({ ...input, payDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Period Type</Label>
                  <Select
                    value={input.periodType}
                    onValueChange={(value) => setInput({ ...input, periodType: value as PeriodType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employee Age</Label>
                  <Input
                    type="number"
                    value={input.employeeAge}
                    onChange={(e) => setInput({ ...input, employeeAge: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Select
                    value={input.maritalStatus}
                    onValueChange={(value) => setInput({ ...input, maritalStatus: value as MaritalStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Any">Any</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select
                  value={input.employmentType}
                  onValueChange={(value) => setInput({ ...input, employmentType: value as EmploymentType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERM">Permanent</SelectItem>
                    <SelectItem value="TEMP">Temporary</SelectItem>
                    <SelectItem value="GOVT">Government</SelectItem>
                    <SelectItem value="MIN_WAGE">Minimum Wage</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Earnings Components</CardTitle>
                <CardDescription>
                  Add pay components for this simulation
                </CardDescription>
              </div>
              <Button size="sm" onClick={handleAddComponent}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {input.earningsComponents.map((component, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Code</Label>
                    <Input
                      placeholder="Code"
                      value={component.componentCode}
                      onChange={(e) => handleComponentChange(index, 'componentCode', e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      placeholder="Name"
                      value={component.componentName}
                      onChange={(e) => handleComponentChange(index, 'componentName', e.target.value)}
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label className="text-xs">Amount</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={component.amount}
                      onChange={(e) => handleComponentChange(index, 'amount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveComponent(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="pt-3 border-t flex justify-between items-center">
                <span className="font-medium">Total Earnings:</span>
                <span className="text-lg font-semibold text-primary">
                  XCD {totalEarnings.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Output Panel */}
        <div className="space-y-6">
          {output ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Calculation Results</CardTitle>
                  <CardDescription>
                    Using {output.schemeUsed.schemeName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Employee Category</div>
                      <Badge variant="outline" className="text-base">
                        {output.employeeCategoryResolved}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Levy Base</div>
                      <div className="text-lg font-semibold">
                        XCD {totalEarnings.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Employee Levy:</span>
                      <span className="text-lg font-semibold text-primary">
                        XCD {output.finalEmployeeLevy.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Employer Levy:</span>
                      <span className="text-lg font-semibold text-primary">
                        XCD {output.finalEmployerLevy.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between items-center">
                      <span className="font-semibold">Total Levy:</span>
                      <span className="text-xl font-bold text-primary">
                        XCD {output.totalLevy.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Levy Base Breakdown</CardTitle>
                  <CardDescription>
                    Components included in calculation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Included</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {output.levyBaseBreakdown.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.componentName}</TableCell>
                          <TableCell>XCD {item.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={item.includedInBase ? 'default' : 'secondary'}>
                              {item.includedInBase ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Slab Calculations</CardTitle>
                  <CardDescription>
                    Breakdown by earning bands
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Band</TableHead>
                        <TableHead>Applicable</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Employer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {output.slabCalculations.map((slab, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {slab.minEarnings} - {slab.maxEarnings || '∞'}
                          </TableCell>
                          <TableCell>XCD {slab.applicableEarnings.toFixed(2)}</TableCell>
                          <TableCell>
                            {slab.employeeRate}% = XCD {slab.employeeLevy.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {slab.employerRate}% = XCD {slab.employerLevy.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {output.warnings.length > 0 && (
                <Card className="border-amber-500">
                  <CardHeader>
                    <CardTitle className="text-amber-600">Warnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {output.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-amber-600">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calculator className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Configure parameters and click "Run Simulation" to see results</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
