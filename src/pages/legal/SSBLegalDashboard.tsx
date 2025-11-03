import { useState, useEffect } from 'react';
import { DashboardFilters, legalDashboardAdapter, KPIData, CollectionsData, ArrearsHeatmapCell, EnforcementFunnelData, WorkloadData, HearingCalendarDay, PostJudgmentCase, ActivityItem } from '@/adapters/legalDashboardAdapter';
import { GlobalFilters } from '@/components/legal/dashboard/GlobalFilters';
import { KPICards } from '@/components/legal/dashboard/KPICards';
import { CollectionsChart } from '@/components/legal/dashboard/CollectionsChart';
import { ArrearsHeatmap } from '@/components/legal/dashboard/ArrearsHeatmap';
import { EnforcementFunnel } from '@/components/legal/dashboard/EnforcementFunnel';
import { WorkloadChart } from '@/components/legal/dashboard/WorkloadChart';
import { HearingCalendarWidget } from '@/components/legal/dashboard/HearingCalendarWidget';
import { PostJudgmentTracker } from '@/components/legal/dashboard/PostJudgmentTracker';
import { RecentActivity } from '@/components/legal/dashboard/RecentActivity';
import { DownloadReports } from '@/components/legal/dashboard/DownloadReports';
import { toast } from '@/hooks/use-toast';

export default function SSBLegalDashboard() {
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
  const [workloadData, setWorkloadData] = useState<WorkloadData[] | null>(null);
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
      const [kpis, collections, arrears, funnel, workload, calendar, postJudgment, activity] = await Promise.all([
        legalDashboardAdapter.getKPIs(filters),
        legalDashboardAdapter.getCollectionsData(filters),
        legalDashboardAdapter.getArrearsHeatmap(filters),
        legalDashboardAdapter.getEnforcementFunnel(filters),
        legalDashboardAdapter.getWorkloadData(filters),
        legalDashboardAdapter.getHearingCalendar(filters),
        legalDashboardAdapter.getPostJudgmentCases(filters),
        legalDashboardAdapter.getRecentActivity(filters)
      ]);

      setKpiData(kpis);
      setCollectionsData(collections);
      setArrearsData(arrears);
      setFunnelData(funnel);
      setWorkloadData(workload);
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

  const handleSaveView = () => {
    toast({
      title: 'View Saved',
      description: 'Your current view has been saved successfully'
    });
  };

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    toast({
      title: 'Exporting Data',
      description: `Preparing ${format.toUpperCase()} export...`
    });
    
    await legalDashboardAdapter.exportData('dashboard', format, filters);
    
    toast({
      title: 'Export Complete',
      description: `Dashboard data exported as ${format.toUpperCase()}`
    });
  };

  const handleReportExport = async (type: string, format: 'csv' | 'xlsx' | 'pdf') => {
    toast({
      title: 'Exporting Report',
      description: `Preparing ${type} report as ${format.toUpperCase()}...`
    });
    
    await legalDashboardAdapter.exportData(type, format, filters);
    
    toast({
      title: 'Export Complete',
      description: `${type} report exported as ${format.toUpperCase()}`
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-6">
        <h1 className="text-3xl font-bold text-foreground">SSB Legal — Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive overview of cases, hearings, enforcement, and financial metrics
        </p>
      </div>

      {/* Global Filters */}
      <GlobalFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSaveView={handleSaveView}
        onExport={handleExport}
      />

      {/* Dashboard Content */}
      <div className="p-6 space-y-6">
        {/* KPI Strip */}
        <KPICards data={kpiData} loading={loading} />

        {/* Row A: Collections & Arrears */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CollectionsChart data={collectionsData} loading={loading} />
          <ArrearsHeatmap data={arrearsData} loading={loading} />
        </div>

        {/* Row B: Enforcement & Workload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EnforcementFunnel data={funnelData} loading={loading} />
          <WorkloadChart data={workloadData} loading={loading} />
        </div>

        {/* Row C: Hearings & Calendar */}
        <HearingCalendarWidget
          data={calendarData}
          loading={loading}
          year={filters.year}
          month={filters.month}
          onYearChange={(year) => setFilters({ ...filters, year })}
          onMonthChange={(month) => setFilters({ ...filters, month })}
        />

        {/* Row D: Risk & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PostJudgmentTracker data={postJudgmentData} loading={loading} />
          <RecentActivity data={activityData} loading={loading} />
        </div>

        {/* Row E: Downloads */}
        <DownloadReports onExport={handleReportExport} />
      </div>
    </div>
  );
}
