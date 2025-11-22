import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAllSchemes } from '@/services/ssSettingsService';

export default function SSSimulator() {
  const schemes = getAllSchemes();
  const [schemeId, setSchemeId] = useState(schemes.find(s => s.isCurrent)?.schemeId || '');
  const [age, setAge] = useState('30');
  const [basicSalary, setBasicSalary] = useState('4000');
  const [overtime, setOvertime] = useState('500');
  const [bonus, setBonus] = useState('0');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidDate, setPaidDate] = useState('');

  const [result, setResult] = useState<any>(null);

  const handleCalculate = () => {
    // Mock calculation
    const basicAmt = parseFloat(basicSalary) || 0;
    const otAmt = parseFloat(overtime) || 0;
    const bonusAmt = parseFloat(bonus) || 0;
    const totalEarnings = basicAmt + otAmt + bonusAmt;
    const cappedEarnings = Math.min(totalEarnings, 6500);
    
    const ageNum = parseInt(age);
    const isContributing = ageNum >= 16 && ageNum <= 62;
    
    const employeeRate = isContributing ? 0.05 : 0;
    const employerRate = isContributing ? 0.05 : 0;
    const injuryRate = 0.01;
    
    const employeeContribution = cappedEarnings * employeeRate;
    const employerContribution = cappedEarnings * employerRate;
    const injuryContribution = cappedEarnings * injuryRate;
    
    let daysLate = 0;
    let monthsLate = 0;
    let penaltyAmount = 0;
    
    if (paidDate) {
      const pay = new Date(payDate);
      const paid = new Date(paidDate);
      const dueDate = new Date(pay.getFullYear(), pay.getMonth() + 2, 0); // end of next month
      
      if (paid > dueDate) {
        daysLate = Math.floor((paid.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        monthsLate = Math.ceil(daysLate / 30);
        penaltyAmount = (employeeContribution + employerContribution + injuryContribution) * 0.05 * monthsLate;
      }
    }
    
    setResult({
      totalEarnings,
      cappedEarnings,
      employeeContribution,
      employerContribution,
      injuryContribution,
      totalContribution: employeeContribution + employerContribution + injuryContribution,
      daysLate,
      monthsLate,
      penaltyAmount,
      totalDue: employeeContribution + employerContribution + injuryContribution + penaltyAmount,
      isContributing,
      ageBand: isContributing ? '16-62' : (ageNum < 16 ? 'Under 16' : 'Over 62'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Social Security Simulator</h1>
        <p className="text-muted-foreground mt-1">
          Test contribution calculations with different scenarios
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Input Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Contribution Scheme</Label>
              <Select value={schemeId} onValueChange={setSchemeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {schemes.map(scheme => (
                    <SelectItem key={scheme.schemeId} value={scheme.schemeId}>
                      {scheme.schemeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Age</Label>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="30"
              />
            </div>

            <div className="space-y-2">
              <Label>Pay Date</Label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Earnings Components</h4>
              
              <div className="space-y-2">
                <Label>Basic Salary (XCD)</Label>
                <Input
                  type="number"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(e.target.value)}
                  placeholder="4000"
                />
              </div>

              <div className="space-y-2">
                <Label>Overtime (XCD)</Label>
                <Input
                  type="number"
                  value={overtime}
                  onChange={(e) => setOvertime(e.target.value)}
                  placeholder="500"
                />
              </div>

              <div className="space-y-2">
                <Label>Bonus (XCD)</Label>
                <Input
                  type="number"
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <Label>Paid Date (Optional - for penalty calculation)</Label>
              <Input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>

            <Button onClick={handleCalculate} className="w-full">
              <Calculator className="h-4 w-4 mr-2" />
              Calculate
            </Button>
          </CardContent>
        </Card>

        {/* Output Panel */}
        <div className="space-y-4">
          {result ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Insurable Earnings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Earnings:</span>
                    <span className="font-medium">XCD {result.totalEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capped Earnings (XCD 6,500 max):</span>
                    <span className="font-medium">XCD {result.cappedEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Age Band:</span>
                    <Badge>{result.ageBand}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contribution Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employee Contribution (5%):</span>
                    <span className="font-medium">XCD {result.employeeContribution.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employer Contribution (5%):</span>
                    <span className="font-medium">XCD {result.employerContribution.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employment Injury (1%):</span>
                    <span className="font-medium">XCD {result.injuryContribution.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total Contribution:</span>
                    <span>XCD {result.totalContribution.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              {paidDate && (
                <Card>
                  <CardHeader>
                    <CardTitle>Penalty Calculation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Days Late:</span>
                      <span className="font-medium">{result.daysLate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Months Late:</span>
                      <span className="font-medium">{result.monthsLate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Penalty (5% per month):</span>
                      <span className="font-medium text-destructive">XCD {result.penaltyAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total Due:</span>
                      <span>XCD {result.totalDue.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!result.isContributing && (
                <Card className="bg-muted">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> For persons {result.ageBand === 'Under 16' ? 'under 16' : 'over 62'}, 
                      only the 1% employment injury contribution is payable.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter parameters and click Calculate to see results</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
