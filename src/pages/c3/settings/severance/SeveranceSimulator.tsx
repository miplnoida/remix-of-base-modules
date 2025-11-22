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

export default function SeveranceSimulator() {
  const [results, setResults] = useState<any>(null);

  const handleCalculate = () => {
    // Mock calculation
    setResults({
      severanceBase: 3000,
      employeeContribution: 0,
      employerContribution: 75,
      totalContribution: 75,
      dueDate: '2025-02-28',
      isLate: false,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Severance Simulator</h1>
        <p className="text-muted-foreground">
          Test severance contribution calculations with sample data
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
                  <SelectItem value="prev">Previous Scheme (2020-2024)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Employee Type</Label>
              <Select defaultValue="PERM">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERM">Permanent</SelectItem>
                  <SelectItem value="TEMP">Temporary</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contribution Period</Label>
                <Input type="month" defaultValue="2025-01" />
              </div>
              <div className="space-y-2">
                <Label>Tenure (Months)</Label>
                <Input type="number" defaultValue="24" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Basic Earnings (XCD)</Label>
              <Input type="number" defaultValue="3000" />
            </div>

            <div className="space-y-2">
              <Label>Pay Date</Label>
              <Input type="date" defaultValue="2025-01-31" />
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
                    <Label className="text-muted-foreground">Severance Base</Label>
                    <p className="text-2xl font-bold">XCD {results.severanceBase.toFixed(2)}</p>
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
                    <span>Employer Contribution:</span>
                    <span className="font-semibold">XCD {results.employerContribution.toFixed(2)}</span>
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
