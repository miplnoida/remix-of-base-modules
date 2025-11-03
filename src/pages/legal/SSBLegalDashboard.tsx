import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardFilters, legalDashboardAdapter, KPIData, CollectionsData, ArrearsHeatmapCell, EnforcementFunnelData, HearingCalendarDay, PostJudgmentCase, ActivityItem } from '@/adapters/legalDashboardAdapter';
import { KPICards } from '@/components/legal/dashboard/KPICards';
import { CollectionsChart } from '@/components/legal/dashboard/CollectionsChart';
import { ArrearsHeatmap } from '@/components/legal/dashboard/ArrearsHeatmap';
import { EnforcementFunnel } from '@/components/legal/dashboard/EnforcementFunnel';
import { HearingCalendarWidget } from '@/components/legal/dashboard/HearingCalendarWidget';
import { PostJudgmentTracker } from '@/components/legal/dashboard/PostJudgmentTracker';
import { RecentActivity } from '@/components/legal/dashboard/RecentActivity';
import { toast } from '@/hooks/use-toast';

export default function SSBLegalDashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    caseTypes: [],
    statuses: ['Active', 'Summons Issued', 'JDS', 'Warrant', 'Writ'],
    officers: [],
    searchTerm: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth()
  });

  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [collectionsData, setCollectionsData] = useState<CollectionsData[] | null>(null);
  const [arrearsData, setArrearsData] = useState<ArrearsHeatmapCell[] | null>(null);
  const [funnelData, setFunnelData] = useState<EnforcementFunnelData[] | null>(null);
  const [calendarData, setCalendarData] = useState<HearingCalendarDay[] | null>(null);
  const [postJudgmentData, setPostJudgmentData] = useState<PostJudgmentCase[] | null>(null);
  const [activityData, setActivityData] = useState<ActivityItem[] | null>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [kpis, collections, arrears, funnel, calendar, postJudgment, activity] = await Promise.all([
        legalDashboardAdapter.getKPIs(filters),
        legalDashboardAdapter.getCollectionsData(filters),
        legalDashboardAdapter.getArrearsHeatmap(filters),
        legalDashboardAdapter.getEnforcementFunnel(filters),
        legalDashboardAdapter.getHearingCalendar(filters),
        legalDashboardAdapter.getPostJudgmentCases(filters),
        legalDashboardAdapter.getRecentActivity(filters)
      ]);

      setKpiData(kpis);
      setCollectionsData(collections);
      setArrearsData(arrears);
      setFunnelData(funnel);
      setCalendarData(calendar);
      setPostJudgmentData(postJudgment);
      setActivityData(activity);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive overview of cases, hearings, enforcement, and financial metrics
        </p>
      </div>

      {/* Dashboard Content */}
      <div className="p-6 space-y-6">
        {/* KPI Strip */}
        <KPICards 
          data={kpiData} 
          loading={loading}
          onActiveCasesClick={() => navigate('/legal/cases')}
          onRiskAlertClick={() => navigate('/legal/cases?filter=highrisk')}
          onHearingsClick={() => navigate('/legal/hearings')}
        />

        {/* Row A: Collections & Arrears */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CollectionsChart 
            data={collectionsData} 
            loading={loading}
            onClick={() => navigate('/legal/reports')}
          />
          <ArrearsHeatmap 
            data={arrearsData} 
            loading={loading}
            onClick={() => navigate('/legal/reports')}
          />
        </div>

        {/* Row B: Enforcement */}
        <EnforcementFunnel 
          data={funnelData} 
          loading={loading}
          onStageClick={(stage) => navigate(`/legal/cases?enforcement=${stage.toLowerCase()}`)}
        />

        {/* Row C: Hearings & Calendar */}
        <HearingCalendarWidget
          data={calendarData}
          loading={loading}
          year={filters.year}
          month={filters.month}
          onYearChange={(year) => setFilters({ ...filters, year })}
          onMonthChange={(month) => setFilters({ ...filters, month })}
          onDateClick={(date) => navigate(`/legal/hearings?date=${date}`)}
        />

        {/* Row D: Risk & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PostJudgmentTracker 
            data={postJudgmentData} 
            loading={loading}
            onCaseClick={(caseId) => navigate(`/legal/cases/${caseId}`)}
          />
          <RecentActivity 
            data={activityData} 
            loading={loading}
            onActivityClick={(activity) => {
              if (activity.caseId) {
                navigate(`/legal/cases/${activity.caseId}`);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
