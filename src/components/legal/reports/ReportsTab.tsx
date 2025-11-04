import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileDown, FileSpreadsheet, FileText, Save, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";

interface ReportConfig {
  dateRange: DateRange | undefined;
  caseType: string;
  status: string;
  enforcementStage: string;
  officer: string;
  employer: string;
}

const AVAILABLE_REPORTS = [
  {
    id: 'caseload-monthly',
    title: 'Caseload by Month',
    description: 'Monthly breakdown of cases by type and status'
  },
  {
    id: 'arrears-collections',
    title: 'Arrears & Collections',
    description: 'Financial summary of arrears assessed vs collected'
  },
  {
    id: 'enforcement-funnel',
    title: 'Enforcement Funnel',
    description: 'Progression through enforcement stages'
  },
  {
    id: 'arrangements-waivers',
    title: 'Arrangements & Waivers',
    description: 'Payment arrangements and penalty waivers'
  },
  {
    id: 'hearing-schedule',
    title: 'Hearing Schedules',
    description: 'Upcoming and past hearing calendar'
  },
  {
    id: 'officer-workload',
    title: 'Officer Workload',
    description: 'Case distribution by assigned officer'
  },
  {
    id: 'sla-compliance',
    title: 'SLA Compliance',
    description: 'Service level agreement compliance metrics'
  },
  {
    id: 'case-outcomes',
    title: 'Case Outcomes',
    description: 'Resolution outcomes by case type'
  }
];

const SAVED_CONFIGS = [
  { id: 'ytd-all', label: 'YTD All Cases' },
  { id: 'q1-arrears', label: 'Q1 Arrears Only' },
  { id: 'active-enforcement', label: 'Active Enforcement' }
];

export function ReportsTab() {
  const [config, setConfig] = useState<ReportConfig>({
    dateRange: undefined,
    caseType: 'all',
    status: 'all',
    enforcementStage: 'all',
    officer: 'all',
    employer: ''
  });

  const [savedConfig, setSavedConfig] = useState<string>('');

  const handleDownload = (reportId: string, format: 'csv' | 'xlsx' | 'pdf') => {
    toast.success(`Downloading ${reportId} as ${format.toUpperCase()}...`);
  };

  const handleSaveConfig = () => {
    toast.success("Report configuration saved");
  };

  const handleLoadConfig = (configId: string) => {
    setSavedConfig(configId);
    toast.success("Configuration loaded");
  };

  return (
    <div className="space-y-6">
      {/* Config Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Set filters to apply to all report downloads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Saved Configs */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label>Saved Configurations</Label>
              <Select value={savedConfig} onValueChange={handleLoadConfig}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a saved configuration" />
                </SelectTrigger>
                <SelectContent>
                  {SAVED_CONFIGS.map(cfg => (
                    <SelectItem key={cfg.id} value={cfg.id}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleSaveConfig}>
              <Save className="h-4 w-4 mr-2" />
              Save Current
            </Button>
          </div>

          {/* Date Range */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !config.dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {config.dateRange?.from ? (
                      config.dateRange.to ? (
                        <>
                          {format(config.dateRange.from, "LLL dd, y")} -{" "}
                          {format(config.dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(config.dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={config.dateRange?.from}
                    selected={config.dateRange}
                    onSelect={(range) => setConfig({ ...config, dateRange: range })}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Case Type</Label>
              <Select value={config.caseType} onValueChange={(v) => setConfig({ ...config, caseType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="employer-arrears">Employer Arrears</SelectItem>
                  <SelectItem value="overpayment">Overpayment Recovery</SelectItem>
                  <SelectItem value="appeal">Insured Appeal</SelectItem>
                  <SelectItem value="compliance">Compliance/Recovery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={config.status} onValueChange={(v) => setConfig({ ...config, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Enforcement Stage</Label>
              <Select value={config.enforcementStage} onValueChange={(v) => setConfig({ ...config, enforcementStage: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="summons">Summons Issued</SelectItem>
                  <SelectItem value="judgment">Judgment Summons</SelectItem>
                  <SelectItem value="warrant">Warrant</SelectItem>
                  <SelectItem value="writ">Writ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assigned Officer</Label>
              <Select value={config.officer} onValueChange={(v) => setConfig({ ...config, officer: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Officers</SelectItem>
                  <SelectItem value="maria">Maria Rodriguez</SelectItem>
                  <SelectItem value="carlos">Carlos Martinez</SelectItem>
                  <SelectItem value="sarah">Sarah Johnson</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Employer/Insured (Optional)</Label>
              <Select value={config.employer} onValueChange={(v) => setConfig({ ...config, employer: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by employer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="company1">ABC Company Ltd</SelectItem>
                  <SelectItem value="company2">XYZ Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
          <CardDescription>Download reports using the configured filters above</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {AVAILABLE_REPORTS.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <h4 className="font-semibold">{report.title}</h4>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(report.id, 'csv')}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(report.id, 'xlsx')}
                    className="gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    XLSX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(report.id, 'pdf')}
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
