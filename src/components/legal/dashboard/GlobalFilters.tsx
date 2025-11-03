import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Calendar as CalendarIcon, Download, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DashboardFilters } from '@/adapters/legalDashboardAdapter';

interface GlobalFiltersProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  onSaveView: () => void;
  onExport: (format: 'csv' | 'xlsx' | 'pdf') => void;
}

export function GlobalFilters({ filters, onFiltersChange, onSaveView, onExport }: GlobalFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [startDate, setStartDate] = useState<Date>(new Date(filters.dateRange.start));
  const [endDate, setEndDate] = useState<Date>(new Date(filters.dateRange.end));

  const caseTypeOptions = ['Non-Payment', 'Late Filing', 'Under-Reporting', 'Administrative'];
  const statusOptions = ['Active', 'Summons Issued', 'JDS', 'Warrant', 'Writ', 'Judgment', 'Closed'];
  const officerOptions = ['J. Williams', 'M. Thompson', 'R. Martinez', 'S. Johnson', 'K. Davis'];

  const toggleCaseType = (type: string) => {
    const updated = filters.caseTypes.includes(type)
      ? filters.caseTypes.filter(t => t !== type)
      : [...filters.caseTypes, type];
    onFiltersChange({ ...filters, caseTypes: updated });
  };

  const toggleStatus = (status: string) => {
    const updated = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: updated });
  };

  const toggleOfficer = (officer: string) => {
    const updated = filters.officers.includes(officer)
      ? filters.officers.filter(o => o !== officer)
      : [...filters.officers, officer];
    onFiltersChange({ ...filters, officers: updated });
  };

  const clearFilters = () => {
    const defaultFilters: DashboardFilters = {
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
    };
    onFiltersChange(defaultFilters);
    setStartDate(new Date(defaultFilters.dateRange.start));
    setEndDate(new Date(defaultFilters.dateRange.end));
  };

  return (
    <div className="bg-card border-b border-border sticky top-0 z-20">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Filters</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onSaveView} aria-label="Save current view">
              <Save className="h-4 w-4 mr-2" />
              Save View
            </Button>
            <Select onValueChange={(format) => onExport(format as 'csv' | 'xlsx' | 'pdf')}>
              <SelectTrigger className="w-32" aria-label="Export data">
                <Download className="h-4 w-4 mr-2" />
                Export
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-4">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal")}
                      aria-label="Select start date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        if (date) {
                          setStartDate(date);
                          onFiltersChange({
                            ...filters,
                            dateRange: { ...filters.dateRange, start: date.toISOString().split('T')[0] }
                          });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date"
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal")}
                      aria-label="Select end date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        if (date) {
                          setEndDate(date);
                          onFiltersChange({
                            ...filters,
                            dateRange: { ...filters.dateRange, end: date.toISOString().split('T')[0] }
                          });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year-select">Year</Label>
                <Select
                  value={filters.year.toString()}
                  onValueChange={(value) => onFiltersChange({ ...filters, year: parseInt(value) })}
                >
                  <SelectTrigger id="year-select" aria-label="Select year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="month-select">Month</Label>
                <Select
                  value={filters.month.toString()}
                  onValueChange={(value) => onFiltersChange({ ...filters, month: parseInt(value) })}
                >
                  <SelectTrigger id="month-select" aria-label="Select month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {format(new Date(2025, i, 1), 'MMMM')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Employer/Insured (RegNo/SSN/Name)</Label>
              <Input
                id="search"
                placeholder="Enter registration number, SSN, or name..."
                value={filters.searchTerm}
                onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
                aria-label="Search employer or insured person"
              />
            </div>

            {/* Multi-select filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Case Type</Label>
                <div className="flex flex-wrap gap-2">
                  {caseTypeOptions.map(type => (
                    <Badge
                      key={type}
                      variant={filters.caseTypes.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleCaseType(type)}
                    >
                      {type}
                      {filters.caseTypes.includes(type) && <X className="ml-1 h-3 w-3" />}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(status => (
                    <Badge
                      key={status}
                      variant={filters.statuses.includes(status) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleStatus(status)}
                    >
                      {status}
                      {filters.statuses.includes(status) && <X className="ml-1 h-3 w-3" />}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Officer</Label>
                <div className="flex flex-wrap gap-2">
                  {officerOptions.map(officer => (
                    <Badge
                      key={officer}
                      variant={filters.officers.includes(officer) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleOfficer(officer)}
                    >
                      {officer}
                      {filters.officers.includes(officer) && <X className="ml-1 h-3 w-3" />}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
