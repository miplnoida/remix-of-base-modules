import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CheckCircle2, Clock, XCircle, AlertCircle, FileText } from 'lucide-react';
import { weeklyReportService } from '@/services/weeklyReportService';
import { WeeklyPlanItem, InspectionVisitStatus } from '@/types/inspectionTypes';
import { WeeklyReportVisitRow } from '@/components/compliance/WeeklyReportVisitRow';
import { WeeklyReportVisitDetail } from '@/components/compliance/WeeklyReportVisitDetail';
import { WeeklyReportSubmitDialog } from '@/components/compliance/WeeklyReportSubmitDialog';

export default function WeeklyReportSubmission() {
  const { toast } = useToast();
  const [inspectorId] = useState('inspector-001'); // Would come from auth context
  const [inspectorName] = useState('John Inspector');
  
  const [weekStartDate, setWeekStartDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [planItems, setPlanItems] = useState<WeeklyPlanItem[]>([]);
  const [selectedPlanItem, setSelectedPlanItem] = useState<WeeklyPlanItem | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  useEffect(() => {
    // Set default to current week's Monday
    const today = new Date();
    const monday = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    setWeekStartDate(monday.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (weekStartDate) {
      loadWeeklyPlanItems();
    }
  }, [weekStartDate]);

  const loadWeeklyPlanItems = async () => {
    setLoading(true);
    try {
      const items = await weeklyReportService.getWeeklyPlanItems(inspectorId, weekStartDate);
      setPlanItems(items);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load weekly plan items',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVisitClick = (item: WeeklyPlanItem) => {
    setSelectedPlanItem(item);
  };

  const handleCloseDetail = () => {
    setSelectedPlanItem(null);
    loadWeeklyPlanItems(); // Refresh list
  };

  const handleSubmitReport = () => {
    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      const summary = await weeklyReportService.submitWeeklyReport(inspectorId, weekStartDate);
      
      toast({
        title: 'Report Submitted',
        description: `Weekly report for week of ${weekStartDate} has been submitted successfully.`
      });

      setShowSubmitDialog(false);
      loadWeeklyPlanItems();
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit weekly report',
        variant: 'destructive'
      });
    }
  };

  const getStatusStats = () => {
    const completed = planItems.filter(i => i.status === InspectionVisitStatus.COMPLETED).length;
    const rescheduled = planItems.filter(i => i.status === InspectionVisitStatus.RESCHEDULED).length;
    const notDone = planItems.filter(i => i.status === InspectionVisitStatus.NOT_DONE).length;
    const pending = planItems.filter(
      i => i.status === InspectionVisitStatus.PLANNED || i.status === InspectionVisitStatus.IN_PROGRESS
    ).length;

    return { completed, rescheduled, notDone, pending };
  };

  const stats = getStatusStats();

  return (
    <div className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Weekly Report Submission"
        subtitle="Review and submit your weekly inspection report"
      />

      {/* Week Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <Label>Week Start Date (Monday)</Label>
              <Input
                type="date"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-3 flex items-end">
              <div className="text-sm text-muted-foreground">
                Inspector: <span className="font-medium text-foreground">{inspectorName}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      {planItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.completed}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.rescheduled}</div>
                  <div className="text-sm text-muted-foreground">Rescheduled</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.notDone}</div>
                  <div className="text-sm text-muted-foreground">Not Done</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.pending}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Visits List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Weekly Plan Items
            </CardTitle>
            <Button
              onClick={handleSubmitReport}
              disabled={planItems.length === 0}
            >
              Submit Weekly Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : planItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No planned visits for the selected week
            </div>
          ) : (
            <div className="space-y-2">
              {planItems.map((item) => (
                <WeeklyReportVisitRow
                  key={item.id}
                  planItem={item}
                  onClick={() => handleVisitClick(item)}
                  onRefresh={loadWeeklyPlanItems}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visit Detail Panel */}
      {selectedPlanItem && (
        <WeeklyReportVisitDetail
          planItem={selectedPlanItem}
          onClose={handleCloseDetail}
        />
      )}

      {/* Submit Dialog */}
      {showSubmitDialog && (
        <WeeklyReportSubmitDialog
          inspectorId={inspectorId}
          weekStartDate={weekStartDate}
          planItems={planItems}
          onClose={() => setShowSubmitDialog(false)}
          onConfirm={handleConfirmSubmit}
        />
      )}
    </div>
  );
}
