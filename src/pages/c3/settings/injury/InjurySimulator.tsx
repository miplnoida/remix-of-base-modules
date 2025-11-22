import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function InjurySimulator() {
  const [results, setResults] = useState<any>(null);

  const handleCalculate = () => {
    // Mock calculation
    setResults({
      injuryBase: 5000,
      employeeContribution: 0,
      employerInjuryContribution: 50,
      totalContribution: 50,
      dueDate: '2025-02-28',
      isLate: false,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employment Injury Simulator</h1>
        <p className="text-muted-foreground">
          Test employment injury contribution calculations with sample data
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Input Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Scheme</Label>
              <Select defaultValue="current">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Scheme (2025+)</SelectItem>
                  <SelectItem value="prev">Previous Scheme (2018-2024)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Employer Category</Label>
              <Select defaultValue="Standard">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="HighRisk">High Risk</SelectItem>
                  <SelectItem value="Government">Government</SelectItem>
                  <SelectItem value="LowRisk">Low Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Industry Code (Optional)</Label>
              <Input placeholder="e.g., CONSTRUCTION" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contribution Period</Label>
                <Input type="month" defaultValue="2025-01" />
              </div>
              <div className="space-y-2">
                <Label>Pay Date</Label>
                <Input type="date" defaultValue="2025-01-31" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Basic Earnings (XCD)</Label>
              <Input type="number" defaultValue="5000" />
            </div>

            <div className="space-y-2">
              <Label>Overtime (XCD)</Label>
              <Input type="number" defaultValue="0" />
            </div>

            <Button onClick={handleCalculate} className="w-full">
              <Calculator className="mr-2 h-4 w-4" />
              Calculate
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calculation Results</CardTitle>
          </CardHeader>
          <CardContent>
            {results ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Injury Base</Label>
                    <p className="text-2xl font-bold">XCD {results.injuryBase.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Due Date</Label>
                    <p className="text-lg font-semibold">{results.dueDate}</p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between">
                    <span>Employee Contribution:</span>
                    <span className="font-semibold">XCD {results.employeeContribution.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Employer Injury Contribution (1%):</span>
                    <span className="font-semibold">XCD {results.employerInjuryContribution.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total Contribution:</span>
                    <span className="text-lg font-bold text-primary">
                      XCD {results.totalContribution.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">Payment Status</Label>
                  <div className="mt-2">
                    <Badge variant={results.isLate ? 'destructive' : 'default'}>
                      {results.isLate ? 'Late Payment' : 'On Time'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> For ages 16-62, employer pays 1% injury contribution.
                    For ages under 16 or over 62, only the 1% injury contribution applies.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                Enter parameters and click Calculate to see results
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
