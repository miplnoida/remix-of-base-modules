import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { WeeklyPlanItem } from '@/types/inspectionTypes';
import { weeklyReportService } from '@/services/weeklyReportService';
import { AlertTriangle, CheckCircle2, FileText, MapPin } from 'lucide-react';

interface WeeklyReportSubmitDialogProps {
  inspectorId: string;
  weekStartDate: string;
  planItems: WeeklyPlanItem[];
  onClose: () => void;
  onConfirm: () => void;
}

export function WeeklyReportSubmitDialog({
  inspectorId,
  weekStartDate,
  planItems,
  onClose,
  onConfirm
}: WeeklyReportSubmitDialogProps) {
  const [validating, setValidating] = useState(true);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    issues: {
      planItemId: string;
      employerName?: string;
      areaName?: string;
      issue: string;
    }[];
  }>({ isValid: true, issues: [] });

  useEffect(() => {
    validateReport();
  }, []);

  const validateReport = async () => {
    setValidating(true);
    try {
      const result = await weeklyReportService.validateWeeklyReport(inspectorId, weekStartDate);
      setValidation(result);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setValidating(false);
    }
  };

  const getWeekEndDate = (startDate: string) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end.toISOString().split('T')[0];
  };

  const completedVisits = planItems.filter(i => i.status === 'COMPLETED').length;
  const rescheduledVisits = planItems.filter(i => i.status === 'RESCHEDULED').length;
  const notDoneVisits = planItems.filter(i => i.status === 'NOT_DONE').length;

  // Count violations created (mock for now)
  const violationsCreated = 0; // Would come from actual data

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Weekly Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {validating ? (
            <div className="text-center py-8 text-muted-foreground">
              Validating report...
            </div>
          ) : validation.isValid ? (
            <>
              <Alert className="bg-success/10 border-success/20">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  Your weekly report is ready for submission. All visits have been properly documented.
                </AlertDescription>
              </Alert>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Report Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Week:</span>
                      <span className="ml-2 font-medium">
                        {weekStartDate} to {getWeekEndDate(weekStartDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Territory:</span>
                      <span className="ml-2 font-medium">
                        {planItems[0]?.territory || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Visits Completed:</span>
                      <span className="ml-2 font-medium text-success">{completedVisits}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Visits Rescheduled:</span>
                      <span className="ml-2 font-medium text-info">{rescheduledVisits}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Not Done:</span>
                      <span className="ml-2 font-medium text-warning">{notDoneVisits}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Violations Created:</span>
                      <span className="ml-2 font-medium text-destructive">{violationsCreated}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-info/10 p-4 rounded-md text-sm text-info">
                <div className="font-medium mb-1">What happens next?</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Your report will be submitted to your supervisor for review</li>
                  <li>A PDF summary will be generated and stored in the system</li>
                  <li>Your supervisor will be notified via the notification system</li>
                  <li>You can view the status of your report in the "My Reports" section</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">
                    The following items need attention before submitting your weekly report:
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                {validation.issues.map((issue, index) => (
                  <Card key={index} className="border-warning/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {issue.employerName ? (
                          <MapPin className="h-5 w-5 text-warning mt-0.5" />
                        ) : (
                          <FileText className="h-5 w-5 text-orange-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-orange-900">
                            {issue.employerName || issue.areaName}
                          </div>
                          <div className="text-sm text-orange-700 mt-1">
                            {issue.issue}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="bg-orange-50 p-4 rounded-md text-sm text-orange-900">
                Please resolve the issues listed above before submitting your weekly report.
                Click on each visit in the main screen to add missing information.
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {validation.isValid ? 'Cancel' : 'Go Back'}
          </Button>
          {validation.isValid && (
            <Button onClick={onConfirm} disabled={validating}>
              Confirm Submission
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
