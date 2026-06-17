import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { BenefitRuleSet, BenefitTestCase, BenefitTestResults } from '@/types/benefitRulesConfig';
import { benefitRulesConfigService } from '@/services/benefitRulesConfigService';
import { useToast } from '@/hooks/use-toast';

interface PreviewTestTabProps {
  benefitRule: BenefitRuleSet;
}

export default function PreviewTestTab({ benefitRule }: PreviewTestTabProps) {
  const { toast } = useToast();
  const [testCase, setTestCase] = useState<Partial<BenefitTestCase>>({
    testData: {
      age: 35,
      dateOfBirth: '1989-01-01',
      totalContributions: 150,
      paidContributions: 150,
      recentContributions13Weeks: 12,
      recentContributions12Months: 48,
      averageWeeklyEarnings: 600,
      averageInsurableWage: 600,
      employmentStatus: 'EMPLOYED',
      hasMedicalCertificate: true,
      hasEmployerVerification: true,
      eventDate: '2024-11-01',
      claimSubmissionDate: '2024-11-05',
    },
  });
  const [testResults, setTestResults] = useState<BenefitTestResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTest = async () => {
    setIsRunning(true);
    try {
      const fullTestCase: BenefitTestCase = {
        testId: `TEST${Date.now()}`,
        benefitRuleSetId: benefitRule.id,
        testName: `Test ${benefitRule.benefitName}`,
        testData: testCase.testData!,
        testStatus: 'PENDING',
      };

      const results = await benefitRulesConfigService.testBenefitRule(fullTestCase);
      setTestResults(results);

      toast({
        title: 'Test Complete',
        description: results.eligibilityMet
          ? 'All eligibility checks passed'
          : 'Some eligibility checks failed',
        variant: results.eligibilityMet ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'An error occurred while running the test',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleTestDataChange = (field: string, value: any) => {
    setTestCase({
      ...testCase,
      testData: {
        ...testCase.testData!,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Benefit Test Engine</CardTitle>
          <CardDescription>
            Run a test scenario to validate eligibility rules and calculation logic
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={testCase.testData?.age || ''}
                onChange={e => handleTestDataChange('age', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalContributions">Total Contributions</Label>
              <Input
                id="totalContributions"
                type="number"
                value={testCase.testData?.totalContributions || ''}
                onChange={e => handleTestDataChange('totalContributions', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recentContributions13Weeks">Contributions (Last 13 Weeks)</Label>
              <Input
                id="recentContributions13Weeks"
                type="number"
                value={testCase.testData?.recentContributions13Weeks || ''}
                onChange={e =>
                  handleTestDataChange('recentContributions13Weeks', parseInt(e.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="averageWeeklyEarnings">Average Weekly Earnings (XCD)</Label>
              <Input
                id="averageWeeklyEarnings"
                type="number"
                value={testCase.testData?.averageWeeklyEarnings || ''}
                onChange={e =>
                  handleTestDataChange('averageWeeklyEarnings', parseFloat(e.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDate">Event Date</Label>
              <Input
                id="eventDate"
                type="date"
                value={testCase.testData?.eventDate || ''}
                onChange={e => handleTestDataChange('eventDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="claimSubmissionDate">Claim Submission Date</Label>
              <Input
                id="claimSubmissionDate"
                type="date"
                value={testCase.testData?.claimSubmissionDate || ''}
                onChange={e => handleTestDataChange('claimSubmissionDate', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasMedicalCertificate"
              checked={testCase.testData?.hasMedicalCertificate}
              onChange={e => handleTestDataChange('hasMedicalCertificate', e.target.checked)}
            />
            <Label htmlFor="hasMedicalCertificate">Has Medical Certificate</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasEmployerVerification"
              checked={testCase.testData?.hasEmployerVerification}
              onChange={e => handleTestDataChange('hasEmployerVerification', e.target.checked)}
            />
            <Label htmlFor="hasEmployerVerification">Has Employer Verification</Label>
          </div>

          <Button onClick={runTest} disabled={isRunning} className="gap-2">
            <Play className="h-4 w-4" />
            {isRunning ? 'Running Test...' : 'Run Test'}
          </Button>
        </CardContent>
      </Card>

      {testResults && (
        <>
          <Card>
            <CardHeader className={testResults.eligibilityMet ? 'bg-primary/10' : 'bg-destructive/10'}>
              <div className="flex items-center gap-3">
                {testResults.eligibilityMet ? (
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                ) : (
                  <XCircle className="h-6 w-6 text-destructive" />
                )}
                <div>
                  <CardTitle>
                    Eligibility: {testResults.eligibilityMet ? 'PASSED' : 'FAILED'}
                  </CardTitle>
                  <CardDescription>
                    {testResults.eligibilityMet
                      ? 'All eligibility requirements met'
                      : 'Some eligibility requirements not met'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {testResults.eligibilityReasons.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-primary">Passed Checks:</h4>
                    <ul className="space-y-1">
                      {testResults.eligibilityReasons.map((reason, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {testResults.failureReasons.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-destructive">Failed Checks:</h4>
                    <ul className="space-y-1">
                      {testResults.failureReasons.map((reason, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {testResults.warnings.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-orange-700">Warnings:</h4>
                    <ul className="space-y-1">
                      {testResults.warnings.map((warning, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calculation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {testResults.calculatedAmountWeekly && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Weekly Amount</p>
                    <p className="text-2xl font-bold">
                      XCD ${testResults.calculatedAmountWeekly.toFixed(2)}
                    </p>
                  </div>
                )}

                {testResults.calculatedAmountMonthly && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Monthly Amount</p>
                    <p className="text-2xl font-bold">
                      XCD ${testResults.calculatedAmountMonthly.toFixed(2)}
                    </p>
                  </div>
                )}

                {testResults.calculatedLumpSum && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Lump Sum</p>
                    <p className="text-2xl font-bold">
                      XCD ${testResults.calculatedLumpSum.toFixed(2)}
                    </p>
                  </div>
                )}

                {testResults.durationWeeks && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-2xl font-bold">{testResults.durationWeeks} weeks</p>
                  </div>
                )}
              </div>

              {testResults.paymentStartDate && (
                <div className="mt-4 rounded-lg border p-4">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Start Date</p>
                      <p className="font-semibold">{testResults.paymentStartDate}</p>
                    </div>
                    {testResults.paymentEndDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Payment End Date</p>
                        <p className="font-semibold">{testResults.paymentEndDate}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {testResults.missingDocuments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Missing Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResults.missingDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="destructive">Missing</Badge>
                      <span className="text-sm">{doc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
