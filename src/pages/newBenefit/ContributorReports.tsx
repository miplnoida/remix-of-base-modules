import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNewBenefitAuth } from '@/contexts/NewBenefitAuthContext';
import { newBenefitService } from '@/services/newBenefitService';
import { Contribution } from '@/types/newBenefit';
import { 
  Download, 
  BarChart3, 
  FileText, 
  Calendar, 
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';

export const ContributorReports: React.FC = () => {
  const { currentUser } = useNewBenefitAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contributionSummary, setContributionSummary] = useState({
    totalWeeks: 0,
    paidWeeks: 0,
    creditedWeeks: 0,
    totalContributions: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (currentUser?.ssn) {
      loadReportData();
    }
  }, [currentUser]);

  const loadReportData = async () => {
    if (!currentUser?.ssn) return;
    
    try {
      const [contributionsData, summaryData] = await Promise.all([
        newBenefitService.getContributionHistory(currentUser.ssn),
        newBenefitService.getContributionSummary(currentUser.ssn)
      ]);

      setContributions(contributionsData);
      setContributionSummary(summaryData);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getYearlyContributions = (year: number) => {
    return contributions.filter(c => c.year === year);
  };

  const getYearlyStats = (year: number) => {
    const yearContributions = getYearlyContributions(year);
    return {
      weeks: yearContributions.length,
      totalWages: yearContributions.reduce((sum, c) => sum + c.wages, 0),
      totalContributions: yearContributions.reduce((sum, c) => sum + c.contribution, 0),
      averageWage: yearContributions.length > 0 ? yearContributions.reduce((sum, c) => sum + c.wages, 0) / yearContributions.length : 0
    };
  };

  const availableYears = [...new Set(contributions.map(c => c.year))].sort((a, b) => b - a);
  const currentYearStats = getYearlyStats(selectedYear);

  const reportTypes = [
    {
      id: 'contribution-statement',
      title: 'Contribution Statement',
      description: 'Detailed record of all contributions paid and credited',
      icon: FileText,
      color: 'text-blue-500',
      downloadAction: () => console.log('Download contribution statement')
    },
    {
      id: 'claims-history',
      title: 'Claims History Report',
      description: 'Complete history of all benefit claims submitted',
      icon: Clock,
      color: 'text-green-500',
      downloadAction: () => console.log('Download claims history')
    },
    {
      id: 'pension-projection',
      title: 'Pension Projection',
      description: 'Estimated pension benefits based on current contributions',
      icon: TrendingUp,
      color: 'text-purple-500',
      downloadAction: () => console.log('Download pension projection')
    },
    {
      id: 'medical-expenses',
      title: 'Medical Expenses Breakdown',
      description: 'Summary of employment injury medical expenses claimed',
      icon: CheckCircle,
      color: 'text-orange-500',
      downloadAction: () => console.log('Download medical expenses')
    },
    {
      id: 'award-letters',
      title: 'Award Letters',
      description: 'Official award letters for approved benefits',
      icon: FileText,
      color: 'text-indigo-500',
      downloadAction: () => console.log('Download award letters')
    },
    {
      id: 'payment-statements',
      title: 'Payment Statements',
      description: 'Record of all benefit payments received',
      icon: DollarSign,
      color: 'text-teal-500',
      downloadAction: () => console.log('Download payment statements')
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View and download your contribution and benefit reports</p>
        </div>
        <Badge variant="outline" className="text-sm">
          SSN: {currentUser?.ssn}
        </Badge>
      </div>

      <Tabs defaultValue="available-reports" className="w-full">
        <TabsList>
          <TabsTrigger value="available-reports">Available Reports</TabsTrigger>
          <TabsTrigger value="contribution-statement">Contribution Statement</TabsTrigger>
          <TabsTrigger value="annual-summary">Annual Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="available-reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Available Reports</span>
              </CardTitle>
              <CardDescription>Download official reports and statements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportTypes.map((report) => {
                  const IconComponent = report.icon;
                  return (
                    <Card key={report.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3 mb-3">
                          <IconComponent className={`h-6 w-6 ${report.color}`} />
                          <div className="flex-1">
                            <h3 className="font-medium">{report.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {report.description}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={report.downloadAction}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contribution-statement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contribution Statement</CardTitle>
              <CardDescription>Detailed contribution history with paid and credited weeks</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Year Selection */}
              <div className="flex items-center space-x-4 mb-6">
                <label htmlFor="year-select" className="text-sm font-medium">
                  Select Year:
                </label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download {selectedYear} Statement
                </Button>
              </div>

              {/* Year Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{currentYearStats.weeks}</p>
                  <p className="text-sm text-blue-600">Contribution Weeks</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    ${currentYearStats.totalWages.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-green-600">Total Wages</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    ${currentYearStats.totalContributions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-purple-600">Total Contributions</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">
                    ${currentYearStats.averageWage.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-orange-600">Average Weekly Wage</p>
                </div>
              </div>

              {/* Recent Contributions Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-3">
                  <h4 className="font-medium">Recent Contributions ({selectedYear})</h4>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3">Week Ending</th>
                        <th className="text-right p-3">Wages</th>
                        <th className="text-right p-3">Contribution</th>
                        <th className="text-center p-3">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getYearlyContributions(selectedYear).slice(0, 20).map((contribution) => (
                        <tr key={contribution.id} className="border-t">
                          <td className="p-3">
                            {new Date(contribution.weekEnding).toLocaleDateString()}
                          </td>
                          <td className="text-right p-3">
                            ${contribution.wages.toFixed(2)}
                          </td>
                          <td className="text-right p-3">
                            ${contribution.contribution.toFixed(2)}
                          </td>
                          <td className="text-center p-3">
                            <Badge variant={contribution.credited ? "secondary" : "default"}>
                              {contribution.credited ? 'Credited' : 'Paid'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="annual-summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Annual Summary</CardTitle>
              <CardDescription>Year-over-year contribution summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableYears.map(year => {
                  const stats = getYearlyStats(year);
                  return (
                    <div key={year} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">{year}</h3>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Weeks</p>
                          <p className="text-xl font-bold">{stats.weeks}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Wages</p>
                          <p className="text-xl font-bold">
                            ${stats.totalWages.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Contributions</p>
                          <p className="text-xl font-bold">
                            ${stats.totalContributions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Weekly Wage</p>
                          <p className="text-xl font-bold">
                            ${stats.averageWage.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};