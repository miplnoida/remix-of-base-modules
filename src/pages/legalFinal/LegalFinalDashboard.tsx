import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Scale, 
  FileText, 
  Calendar, 
  DollarSign, 
  Users, 
  AlertTriangle,
  TrendingUp,
  Building2,
  Clock
} from 'lucide-react';
import { LegalFinalService } from '@/services/legalFinalService';
import { LegalDashboardStats } from '@/types/legalFinal';
import { useNavigate } from 'react-router-dom';

export const LegalFinalDashboard = () => {
  const [stats, setStats] = useState<LegalDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        const dashboardStats = await LegalFinalService.getDashboardStats();
        setStats(dashboardStats);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Legal Final Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive legal case management overview</p>
        </div>
        <Button onClick={() => navigate('/legal-final/new-case')}>
          <FileText className="h-4 w-4 mr-2" />
          New Case
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Open Cases</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOpenCases}</div>
            <p className="text-xs text-muted-foreground">Active legal proceedings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.financialRecovery.collectionRate * 100).toFixed(1)}%</div>
            <Progress value={stats.financialRecovery.collectionRate * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.financialRecovery.totalCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              of ${stats.financialRecovery.totalOrdered.toLocaleString()} ordered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Hearings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingHearings}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cases by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Cases by Type
            </CardTitle>
            <CardDescription>Breakdown of active legal cases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.casesByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </Badge>
                </div>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Employers in Arrears */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Top Employers in Arrears
            </CardTitle>
            <CardDescription>Employers with active legal cases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.topEmployersInArrears.map((employer, index) => (
              <div key={employer.employerName} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{employer.employerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {employer.caseCount} case{employer.caseCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${employer.amountOwed.toLocaleString()}</p>
                  <Badge variant="destructive" className="text-xs">
                    Owed
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => navigate('/legal-final/cases')}
            >
              <Scale className="h-6 w-6 mb-2" />
              View All Cases
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => navigate('/legal-final/hearings')}
            >
              <Calendar className="h-6 w-6 mb-2" />
              Hearing Schedule
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => navigate('/legal-final/enforcement')}
            >
              <Users className="h-6 w-6 mb-2" />
              Enforcement Actions
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => navigate('/legal-final/reports')}
            >
              <FileText className="h-6 w-6 mb-2" />
              Generate Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};