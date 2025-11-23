import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Users, Plus, Trash2, Download, Save, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// EC3 Format Structure based on St. Kitts & Nevis Social Security specification
interface C3LineItem {
  lineNumber: number;
  ssn: string;
  employeeName: string;
  dateFrom: string;
  dateTo: string;
  paidForOthers: boolean; // Y/N
  payPeriods: number; // Number of pay periods (weeks)
  holiday: boolean; // Y/N
  bonus: boolean; // Y/N
  wagesPaid: number;
  levy: number;
  totalSS: number; // Total Social Security contribution
  overAge: boolean; // Y/N - Over age 62
  underAge: boolean; // Y/N - Under age 16
  invalidSSN: boolean; // Y/N
}

const C3Simulation = () => {
  const { toast } = useToast();
  const [headerInfo, setHeaderInfo] = useState({
    registrationNumber: "",
    period: "",
    version: "1.0.0",
    companyName: ""
  });

  const [lineItems, setLineItems] = useState<C3LineItem[]>([
    {
      lineNumber: 1,
      ssn: "",
      employeeName: "",
      dateFrom: "",
      dateTo: "",
      paidForOthers: false,
      payPeriods: 4,
      holiday: false,
      bonus: false,
      wagesPaid: 3000,
      levy: 0,
      totalSS: 0,
      overAge: false,
      underAge: false,
      invalidSSN: false
    }
  ]);

  // Calculation logic based on St. Kitts & Nevis rules
  const calculateLineContributions = (line: C3LineItem) => {
    const monthlyCap = 6500;
    const insurableEarnings = Math.min(line.wagesPaid, monthlyCap);
    
    // Determine if SS contributions apply (ages 16-62 only)
    const ssApplies = !line.underAge && !line.overAge;
    
    // Social Security: 5% employee + 5% employer = 10% total
    const socialSecurityRate = ssApplies ? 0.10 : 0.0;
    const totalSS = insurableEarnings * socialSecurityRate;
    
    // Employment Injury: 1% (always applicable, paid by employer)
    const employmentInjury = insurableEarnings * 0.01;
    
    // Levy (Housing & Social Development): 2%
    const levy = insurableEarnings * 0.02;
    
    // Severance: 1%
    const severance = insurableEarnings * 0.01;
    
    // Employee portion (5% of SS if applicable)
    const employeeDeduction = insurableEarnings * (ssApplies ? 0.05 : 0.0);
    
    // Employer portion (SS 5% + Injury 1% + Levy 2% + Severance 1%)
    const employerCost = insurableEarnings * (ssApplies ? 0.05 : 0.0) + employmentInjury + levy + severance;
    
    return {
      insurableEarnings,
      socialSecurity: totalSS,
      employmentInjury,
      levy,
      severance,
      employeeDeduction,
      employerCost,
      grandTotal: totalSS + employmentInjury + levy + severance
    };
  };

  const addLineItem = () => {
    const newLine: C3LineItem = {
      lineNumber: lineItems.length + 1,
      ssn: "",
      employeeName: "",
      dateFrom: "",
      dateTo: "",
      paidForOthers: false,
      payPeriods: 4,
      holiday: false,
      bonus: false,
      wagesPaid: 3000,
      levy: 0,
      totalSS: 0,
      overAge: false,
      underAge: false,
      invalidSSN: false
    };
    setLineItems([...lineItems, newLine]);
  };

  const removeLineItem = (lineNumber: number) => {
    if (lineItems.length > 1) {
      const filtered = lineItems.filter(item => item.lineNumber !== lineNumber);
      // Renumber remaining items
      const renumbered = filtered.map((item, index) => ({
        ...item,
        lineNumber: index + 1
      }));
      setLineItems(renumbered);
    } else {
      toast({
        title: "Cannot Remove",
        description: "At least one line item is required",
        variant: "destructive"
      });
    }
  };

  const updateLineItem = (lineNumber: number, field: keyof C3LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.lineNumber === lineNumber) {
        const updated = { ...item, [field]: value };
        
        // Auto-calculate contributions
        if (field === 'wagesPaid' || field === 'overAge' || field === 'underAge') {
          const calc = calculateLineContributions(updated);
          updated.totalSS = calc.socialSecurity;
          updated.levy = calc.levy;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const calculateFooterTotals = () => {
    const totals = lineItems.reduce((acc, line) => {
      const calc = calculateLineContributions(line);
      return {
        totalEmployees: acc.totalEmployees + 1,
        totalWages: acc.totalWages + line.wagesPaid,
        totalSS: acc.totalSS + calc.socialSecurity,
        totalLevy: acc.totalLevy + calc.levy,
        totalSeverance: acc.totalSeverance + calc.severance,
        totalInjury: acc.totalInjury + calc.employmentInjury,
        grandTotal: acc.grandTotal + calc.grandTotal
      };
    }, {
      totalEmployees: 0,
      totalWages: 0,
      totalSS: 0,
      totalLevy: 0,
      totalSeverance: 0,
      totalInjury: 0,
      grandTotal: 0
    });
    return totals;
  };

  const handleGenerateEC3File = () => {
    // Generate EC3 format file content
    let ec3Content = "";
    
    // Header Record
    ec3Content += `HDR,${headerInfo.registrationNumber},${headerInfo.period},${headerInfo.version},${headerInfo.companyName}\n`;
    
    // Detail Records
    lineItems.forEach(line => {
      ec3Content += `LINE,${line.ssn},${line.employeeName},${line.dateFrom},${line.dateTo},`;
      ec3Content += `${line.paidForOthers ? 'Y' : 'N'},${line.payPeriods},`;
      ec3Content += `${line.holiday ? 'Y' : 'N'},${line.bonus ? 'Y' : 'N'},`;
      ec3Content += `${line.wagesPaid.toFixed(2)},${line.levy.toFixed(2)},${line.totalSS.toFixed(2)},`;
      ec3Content += `${line.overAge ? 'Y' : 'N'},${line.underAge ? 'Y' : 'N'},${line.invalidSSN ? 'Y' : 'N'}\n`;
    });
    
    // Footer Record
    const totals = calculateFooterTotals();
    ec3Content += `FTR,${headerInfo.registrationNumber},${headerInfo.period},`;
    ec3Content += `${lineItems.length},${totals.totalWages.toFixed(2)},${totals.totalSS.toFixed(2)}\n`;
    
    // Download file
    const blob = new Blob([ec3Content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `C3_${headerInfo.registrationNumber}_${headerInfo.period}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "EC3 File Generated",
      description: "Electronic C3 file has been generated and downloaded",
    });
  };

  const handleSaveSimulation = () => {
    toast({
      title: "Simulation Saved",
      description: "C3 simulation has been saved successfully",
    });
  };

  const totals = calculateFooterTotals();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="C3 Simulation (EC3 Format)"
        subtitle="Official St. Kitts & Nevis Social Security Electronic C3 format"
        breadcrumbs={[
          { label: "C3 Management", href: "/c3-management/dashboard" },
          { label: "C3 Simulation" }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SSC Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">10%</div>
            <p className="text-xs text-muted-foreground">5% + 5% (Ages 16-62)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Injury</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">1%</div>
            <p className="text-xs text-muted-foreground">Employer Paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Levy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">2%</div>
            <p className="text-xs text-muted-foreground">Housing & Development</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Severance</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">1%</div>
            <p className="text-xs text-muted-foreground">Employer Paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cap</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">EC$6,500</div>
            <p className="text-xs text-muted-foreground">Insurable Limit</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ec3-entry" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ec3-entry">EC3 Entry Form</TabsTrigger>
          <TabsTrigger value="summary">Summary & Totals</TabsTrigger>
          <TabsTrigger value="format-guide">Format Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="ec3-entry" className="space-y-6">
          {/* Header Record */}
          <Card>
            <CardHeader>
              <CardTitle>Header Record (HDR)</CardTitle>
              <CardDescription>Employer and period information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regno">Registration Number (REGNO) *</Label>
                  <Input
                    id="regno"
                    value={headerInfo.registrationNumber}
                    onChange={(e) => setHeaderInfo({...headerInfo, registrationNumber: e.target.value})}
                    placeholder="e.g., EMP-12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period">Period (dd/01/yyyy) *</Label>
                  <Input
                    id="period"
                    type="month"
                    value={headerInfo.period}
                    onChange={(e) => setHeaderInfo({...headerInfo, period: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="version">Version *</Label>
                  <Input
                    id="version"
                    value={headerInfo.version}
                    onChange={(e) => setHeaderInfo({...headerInfo, version: e.target.value})}
                    placeholder="1.0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name *</Label>
                  <Input
                    id="company"
                    value={headerInfo.companyName}
                    onChange={(e) => setHeaderInfo({...headerInfo, companyName: e.target.value})}
                    placeholder="Enter company name"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detail Records (LINE)</CardTitle>
                  <CardDescription>Employee wage and contribution details</CardDescription>
                </div>
                <Button onClick={addLineItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lineItems.map((line) => (
                  <Card key={line.lineNumber} className="p-4 bg-muted/30">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-semibold">Line #{line.lineNumber}</h4>
                      {lineItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(line.lineNumber)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Row 1 */}
                      <div className="space-y-2">
                        <Label>SSN</Label>
                        <Input
                          value={line.ssn}
                          onChange={(e) => updateLineItem(line.lineNumber, 'ssn', e.target.value)}
                          placeholder="XXX-XX-XXXX"
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label>Employee Name</Label>
                        <Input
                          value={line.employeeName}
                          onChange={(e) => updateLineItem(line.lineNumber, 'employeeName', e.target.value)}
                          placeholder="Full name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Pay Periods (Weeks)</Label>
                        <Input
                          type="number"
                          value={line.payPeriods}
                          onChange={(e) => updateLineItem(line.lineNumber, 'payPeriods', parseInt(e.target.value) || 0)}
                          placeholder="4"
                        />
                      </div>

                      {/* Row 2 */}
                      <div className="space-y-2">
                        <Label>Date From</Label>
                        <Input
                          type="date"
                          value={line.dateFrom}
                          onChange={(e) => updateLineItem(line.lineNumber, 'dateFrom', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Date To</Label>
                        <Input
                          type="date"
                          value={line.dateTo}
                          onChange={(e) => updateLineItem(line.lineNumber, 'dateTo', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Wages Paid (EC$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={line.wagesPaid}
                          onChange={(e) => updateLineItem(line.lineNumber, 'wagesPaid', parseFloat(e.target.value) || 0)}
                          placeholder="3000.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Calculated Total SS</Label>
                        <div className="h-10 flex items-center px-3 bg-background rounded-md border">
                          <span className="font-semibold text-primary">
                            EC${calculateLineContributions(line).socialSecurity.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Row 3 - Flags */}
                      <div className="flex items-center space-x-2 pt-6">
                        <Checkbox
                          id={`paid-others-${line.lineNumber}`}
                          checked={line.paidForOthers}
                          onCheckedChange={(checked) => updateLineItem(line.lineNumber, 'paidForOthers', checked)}
                        />
                        <Label htmlFor={`paid-others-${line.lineNumber}`} className="text-sm">
                          Paid for Others
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 pt-6">
                        <Checkbox
                          id={`holiday-${line.lineNumber}`}
                          checked={line.holiday}
                          onCheckedChange={(checked) => updateLineItem(line.lineNumber, 'holiday', checked)}
                        />
                        <Label htmlFor={`holiday-${line.lineNumber}`} className="text-sm">
                          Holiday Pay
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 pt-6">
                        <Checkbox
                          id={`bonus-${line.lineNumber}`}
                          checked={line.bonus}
                          onCheckedChange={(checked) => updateLineItem(line.lineNumber, 'bonus', checked)}
                        />
                        <Label htmlFor={`bonus-${line.lineNumber}`} className="text-sm">
                          Bonus
                        </Label>
                      </div>

                      <div className="space-y-2">
                        <Label>Age Status</Label>
                        <Select
                          value={line.overAge ? 'over' : line.underAge ? 'under' : 'normal'}
                          onValueChange={(value) => {
                            updateLineItem(line.lineNumber, 'overAge', value === 'over');
                            updateLineItem(line.lineNumber, 'underAge', value === 'under');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under">Under 16</SelectItem>
                            <SelectItem value="normal">16-62 (Normal)</SelectItem>
                            <SelectItem value="over">Over 62</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleGenerateEC3File}>
              <Download className="h-4 w-4 mr-2" />
              Generate EC3 File
            </Button>
            <Button onClick={handleSaveSimulation}>
              <Save className="h-4 w-4 mr-2" />
              Save Simulation
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          {/* Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>C3 Summary Table</CardTitle>
              <CardDescription>Complete breakdown of all line items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Line</TableHead>
                      <TableHead>SSN</TableHead>
                      <TableHead>Employee Name</TableHead>
                      <TableHead className="text-right">Wages Paid</TableHead>
                      <TableHead className="text-right">SS (10%)</TableHead>
                      <TableHead className="text-right">Levy (2%)</TableHead>
                      <TableHead className="text-right">Injury (1%)</TableHead>
                      <TableHead className="text-right">Severance (1%)</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((line) => {
                      const calc = calculateLineContributions(line);
                      return (
                        <TableRow key={line.lineNumber}>
                          <TableCell>{line.lineNumber}</TableCell>
                          <TableCell>{line.ssn}</TableCell>
                          <TableCell className="font-medium">{line.employeeName || `Line ${line.lineNumber}`}</TableCell>
                          <TableCell className="text-right">EC${line.wagesPaid.toFixed(2)}</TableCell>
                          <TableCell className="text-right">EC${calc.socialSecurity.toFixed(2)}</TableCell>
                          <TableCell className="text-right">EC${calc.levy.toFixed(2)}</TableCell>
                          <TableCell className="text-right">EC${calc.employmentInjury.toFixed(2)}</TableCell>
                          <TableCell className="text-right">EC${calc.severance.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">EC${calc.grandTotal.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={3}>FOOTER TOTALS (FTR)</TableCell>
                      <TableCell className="text-right">EC${totals.totalWages.toFixed(2)}</TableCell>
                      <TableCell className="text-right">EC${totals.totalSS.toFixed(2)}</TableCell>
                      <TableCell className="text-right">EC${totals.totalLevy.toFixed(2)}</TableCell>
                      <TableCell className="text-right">EC${totals.totalInjury.toFixed(2)}</TableCell>
                      <TableCell className="text-right">EC${totals.totalSeverance.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-primary text-lg">EC${totals.grandTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Control Totals */}
          <Card className="bg-accent/20">
            <CardHeader>
              <CardTitle>Footer Record (FTR) - Control Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Number of Records (NUMRECS)</p>
                  <p className="text-3xl font-bold text-primary">{totals.totalEmployees}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Total Wages (CTRLTTL)</p>
                  <p className="text-3xl font-bold text-primary">EC${totals.totalWages.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Total SS (TTLSS)</p>
                  <p className="text-3xl font-bold text-primary">EC${totals.totalSS.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Grand Total to SSB</p>
                  <p className="text-3xl font-bold text-primary">EC${totals.grandTotal.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="format-guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>EC3 Standard File Format v1.0.0</CardTitle>
              <CardDescription>Official St. Kitts & Nevis Social Security Electronic C3 specification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge>HDR</Badge>
                  Header Record
                </h3>
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 font-mono text-sm">
                  <p>HDR, REGNO, PERIOD (dd/01/yyyy), VERSION, COMPANY</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Example: HDR,EMP-12345,01/01/2024,1.0.0,ABC Company Ltd
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge>LINE</Badge>
                  Detail Records (Employee Lines)
                </h3>
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="font-mono text-sm">LINE, SSN, Name, DateFrom, DateTo, PaidForOthers(Y/N), PayPeriods, Holiday(Y/N), Bonus(Y/N), WagesPaid, Levy, TotalSS, OverAge(Y/N), UnderAge(Y/N), InvalidSSN(Y/N)</p>
                  <div className="mt-4 space-y-1 text-sm">
                    <p><strong>SSN:</strong> Employee Social Security Number (XXX-XX-XXXX)</p>
                    <p><strong>PayPeriods:</strong> Number of weeks worked in period</p>
                    <p><strong>WagesPaid:</strong> Total wages subject to contributions (capped at EC$6,500)</p>
                    <p><strong>TotalSS:</strong> 10% of insurable earnings (5% employee + 5% employer, ages 16-62 only)</p>
                    <p><strong>Levy:</strong> 2% for Housing & Social Development</p>
                    <p><strong>OverAge/UnderAge:</strong> Y if outside 16-62 age range (no SS contributions)</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge>FTR</Badge>
                  Footer Record (Control Totals)
                </h3>
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 font-mono text-sm">
                  <p>FTR, REGNO, PERIOD, NUMRECS, CTRLTTL, TTLSS</p>
                  <div className="mt-4 space-y-1 text-sm font-sans">
                    <p><strong>NUMRECS:</strong> Total number of LINE records</p>
                    <p><strong>CTRLTTL:</strong> Sum of all WagesPaid amounts</p>
                    <p><strong>TTLSS:</strong> Sum of all TotalSS amounts</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Validation Rules</h3>
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                  <ul className="list-disc list-inside space-y-1">
                    <li>File format: Comma-delimited (CSV), CR/LF line endings, no quotes</li>
                    <li>NUMRECS must match actual number of LINE records</li>
                    <li>CTRLTTL must equal sum of all WagesPaid values</li>
                    <li>TTLSS must equal sum of all TotalSS values</li>
                    <li>SSN format validation (XXX-XX-XXXX)</li>
                    <li>Date format: dd/MM/yyyy</li>
                    <li>WagesPaid capped at EC$6,500 per month per employee</li>
                    <li>Social Security contributions only apply to ages 16-62</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Contribution Components</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">SSC - Social Security (10%)</h4>
                    <p className="text-sm">Employee: 5% | Employer: 5%</p>
                    <p className="text-xs text-muted-foreground mt-1">Ages 16-62 only</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">LVC - Levy (2%)</h4>
                    <p className="text-sm">Housing & Social Development</p>
                    <p className="text-xs text-muted-foreground mt-1">All employees</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">PEC - Severance (1%)</h4>
                    <p className="text-sm">Employer paid</p>
                    <p className="text-xs text-muted-foreground mt-1">Termination protection</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Employment Injury (1%)</h4>
                    <p className="text-sm">Employer paid</p>
                    <p className="text-xs text-muted-foreground mt-1">Work injury insurance</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default C3Simulation;
