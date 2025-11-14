import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calculator, DollarSign, TrendingUp, TrendingDown, Save, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Denomination {
  value: number;
  count: number;
  total: number;
}

interface CashCount {
  currency: string;
  denominations: Denomination[];
  totalCash: number;
}

const CashDetails: React.FC = () => {
  const { toast } = useToast();
  
  const [ecDenominations, setEcDenominations] = useState<Denomination[]>([
    { value: 100, count: 0, total: 0 },
    { value: 50, count: 0, total: 0 },
    { value: 20, count: 0, total: 0 },
    { value: 10, count: 0, total: 0 },
    { value: 5, count: 0, total: 0 },
    { value: 2, count: 0, total: 0 },
    { value: 1, count: 0, total: 0 },
    { value: 0.25, count: 0, total: 0 },
    { value: 0.10, count: 0, total: 0 },
    { value: 0.05, count: 0, total: 0 },
    { value: 0.02, count: 0, total: 0 },
    { value: 0.01, count: 0, total: 0 }
  ]);

  const [usDenominations, setUsDenominations] = useState<Denomination[]>([
    { value: 100, count: 0, total: 0 },
    { value: 50, count: 0, total: 0 },
    { value: 20, count: 0, total: 0 },
    { value: 10, count: 0, total: 0 },
    { value: 5, count: 0, total: 0 },
    { value: 1, count: 0, total: 0 },
    { value: 0.25, count: 0, total: 0 },
    { value: 0.10, count: 0, total: 0 },
    { value: 0.05, count: 0, total: 0 },
    { value: 0.01, count: 0, total: 0 }
  ]);

  const [systemTotals] = useState({
    ec: 8750.50,
    us: 1250.00,
    cardTotal: 2500.00,
    checkTotal: 1800.00
  });

  const [overShortReportOpen, setOverShortReportOpen] = useState(false);

  const updateDenomination = (currency: 'EC' | 'US', index: number, count: string) => {
    const countNum = parseInt(count) || 0;
    
    if (currency === 'EC') {
      const updated = [...ecDenominations];
      updated[index].count = countNum;
      updated[index].total = countNum * updated[index].value;
      setEcDenominations(updated);
    } else {
      const updated = [...usDenominations];
      updated[index].count = countNum;
      updated[index].total = countNum * updated[index].value;
      setUsDenominations(updated);
    }
  };

  const calculateCashTotal = (denominations: Denomination[]) => {
    return denominations.reduce((sum, denom) => sum + denom.total, 0);
  };

  const generateOverShortReport = () => {
    const physicalEcTotal = calculateCashTotal(ecDenominations);
    const physicalUsTotal = calculateCashTotal(usDenominations);
    const totalPhysical = physicalEcTotal + physicalUsTotal + systemTotals.cardTotal + systemTotals.checkTotal;
    const totalSystem = systemTotals.ec + systemTotals.us + systemTotals.cardTotal + systemTotals.checkTotal;
    
    return {
      physicalEcTotal,
      physicalUsTotal,
      totalPhysical,
      totalSystem,
      ecVariance: physicalEcTotal - systemTotals.ec,
      usVariance: physicalUsTotal - systemTotals.us,
      totalVariance: totalPhysical - totalSystem
    };
  };

  const saveCashCount = () => {
    const report = generateOverShortReport();
    
    toast({
      title: "Cash Count Saved",
      description: `Total variance: ${report.totalVariance >= 0 ? '+' : ''}$${Math.abs(report.totalVariance).toFixed(2)}`,
      variant: report.totalVariance === 0 ? "default" : "destructive"
    });
  };

  const formatCurrency = (amount: number, currency: string = '') => {
    return `${currency}${Math.abs(amount).toFixed(2)}`;
  };

  const getDenominationLabel = (value: number) => {
    if (value >= 1) {
      return `$${value}`;
    } else {
      return `${(value * 100).toFixed(0)}¢`;
    }
  };

  const report = generateOverShortReport();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cash Details Entry</h1>
          <p className="text-muted-foreground">Enter physical cash count and generate over/short reports</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveCashCount}>
            <Save className="h-4 w-4 mr-2" />
            Save Cash Count
          </Button>
          <Dialog open={overShortReportOpen} onOpenChange={setOverShortReportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Over/Short Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Over/Short Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        EC$ {formatCurrency(report.physicalEcTotal)}
                      </div>
                      <div className="text-sm text-muted-foreground">Physical EC$</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        US$ {formatCurrency(report.physicalUsTotal)}
                      </div>
                      <div className="text-sm text-muted-foreground">Physical US$</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className={`text-2xl font-bold ${report.totalVariance === 0 ? 'text-green-600' : report.totalVariance > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {report.totalVariance >= 0 ? '+' : '-'}${formatCurrency(report.totalVariance)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Variance</div>
                    </CardContent>
                  </Card>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Currency</TableHead>
                      <TableHead>System Total</TableHead>
                      <TableHead>Physical Count</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>EC$</TableCell>
                      <TableCell>EC$ {formatCurrency(systemTotals.ec)}</TableCell>
                      <TableCell>EC$ {formatCurrency(report.physicalEcTotal)}</TableCell>
                      <TableCell>
                        <span className={report.ecVariance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {report.ecVariance >= 0 ? '+' : ''}EC$ {formatCurrency(report.ecVariance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.ecVariance === 0 ? "default" : report.ecVariance > 0 ? "secondary" : "destructive"}>
                          {report.ecVariance === 0 ? 'Balanced' : report.ecVariance > 0 ? 'Over' : 'Short'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>US$</TableCell>
                      <TableCell>US$ {formatCurrency(systemTotals.us)}</TableCell>
                      <TableCell>US$ {formatCurrency(report.physicalUsTotal)}</TableCell>
                      <TableCell>
                        <span className={report.usVariance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {report.usVariance >= 0 ? '+' : ''}US$ {formatCurrency(report.usVariance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.usVariance === 0 ? "default" : report.usVariance > 0 ? "secondary" : "destructive"}>
                          {report.usVariance === 0 ? 'Balanced' : report.usVariance > 0 ? 'Over' : 'Short'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Calculator className="h-6 w-6 text-blue-600 mr-2" />
              <span className="text-lg font-semibold">System Total</span>
            </div>
            <div className="text-2xl font-bold">
              ${formatCurrency(systemTotals.ec + systemTotals.us)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="h-6 w-6 text-green-600 mr-2" />
              <span className="text-lg font-semibold">Physical Count</span>
            </div>
            <div className="text-2xl font-bold">
              ${formatCurrency(calculateCashTotal(ecDenominations) + calculateCashTotal(usDenominations))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              {report.totalVariance >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600 mr-2" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600 mr-2" />
              )}
              <span className="text-lg font-semibold">Variance</span>
            </div>
            <div className={`text-2xl font-bold ${report.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {report.totalVariance >= 0 ? '+' : ''}${formatCurrency(report.totalVariance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ec" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ec">EC$ Cash Count</TabsTrigger>
          <TabsTrigger value="us">US$ Cash Count</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="ec" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>EC$ Denomination Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ecDenominations.map((denom, index) => (
                  <div key={index} className="space-y-2">
                    <Label>{getDenominationLabel(denom.value)}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={denom.count}
                        onChange={(e) => updateDenomination('EC', index, e.target.value)}
                        placeholder="Count"
                        className="flex-1"
                      />
                      <div className="w-24 flex items-center justify-center bg-muted rounded px-2 text-sm">
                        EC$ {denom.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total EC$:</span>
                  <span className="text-xl font-bold">EC$ {calculateCashTotal(ecDenominations).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-muted-foreground">System Total:</span>
                  <span className="text-sm">EC$ {systemTotals.ec.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Variance:</span>
                  <span className={`text-sm font-semibold ${report.ecVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {report.ecVariance >= 0 ? '+' : ''}EC$ {report.ecVariance.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="us" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>US$ Denomination Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {usDenominations.map((denom, index) => (
                  <div key={index} className="space-y-2">
                    <Label>{getDenominationLabel(denom.value)}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={denom.count}
                        onChange={(e) => updateDenomination('US', index, e.target.value)}
                        placeholder="Count"
                        className="flex-1"
                      />
                      <div className="w-24 flex items-center justify-center bg-muted rounded px-2 text-sm">
                        US$ {denom.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total US$:</span>
                  <span className="text-xl font-bold">US$ {calculateCashTotal(usDenominations).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-muted-foreground">System Total:</span>
                  <span className="text-sm">US$ {systemTotals.us.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Variance:</span>
                  <span className={`text-sm font-semibold ${report.usVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {report.usVariance >= 0 ? '+' : ''}US$ {report.usVariance.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Cash Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>System Total</TableHead>
                    <TableHead>Physical Count</TableHead>
                    <TableHead>Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>EC$ Cash</TableCell>
                    <TableCell>EC$ {systemTotals.ec.toFixed(2)}</TableCell>
                    <TableCell>EC$ {report.physicalEcTotal.toFixed(2)}</TableCell>
                    <TableCell className={report.ecVariance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {report.ecVariance >= 0 ? '+' : ''}EC$ {report.ecVariance.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>US$ Cash</TableCell>
                    <TableCell>US$ {systemTotals.us.toFixed(2)}</TableCell>
                    <TableCell>US$ {report.physicalUsTotal.toFixed(2)}</TableCell>
                    <TableCell className={report.usVariance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {report.usVariance >= 0 ? '+' : ''}US$ {report.usVariance.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Card Payments</TableCell>
                    <TableCell>$ {systemTotals.cardTotal.toFixed(2)}</TableCell>
                    <TableCell>$ {systemTotals.cardTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-green-600">$0.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Check Payments</TableCell>
                    <TableCell>$ {systemTotals.checkTotal.toFixed(2)}</TableCell>
                    <TableCell>$ {systemTotals.checkTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-green-600">$0.00</TableCell>
                  </TableRow>
                  <TableRow className="font-semibold border-t-2">
                    <TableCell>Total</TableCell>
                    <TableCell>$ {(systemTotals.ec + systemTotals.us + systemTotals.cardTotal + systemTotals.checkTotal).toFixed(2)}</TableCell>
                    <TableCell>$ {report.totalPhysical.toFixed(2)}</TableCell>
                    <TableCell className={report.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {report.totalVariance >= 0 ? '+' : ''}$ {report.totalVariance.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CashDetails;