import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WeeklyPlanItem, InspectionVisit, InspectionVisitStatus } from '@/types/inspectionTypes';
import { CheckInOutTabContent } from './inspection/CheckInOutTabContent';
import { EmployerInteractionTabContent } from './inspection/EmployerInteractionTabContent';
import { WorkingPapersTabContent } from './inspection/WorkingPapersTabContent';
import { EvidenceTabContent } from './inspection/EvidenceTabContent';
import { FindingsTabContent } from './inspection/FindingsTabContent';
import { ViolationsTabContent } from './inspection/ViolationsTabContent';
import { CheckOutCloseTabContent } from './inspection/CheckOutCloseTabContent';
import { inspectionService } from '@/services/inspectionService';

interface ExecutePlanItemDialogProps {
  planItem: WeeklyPlanItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function ExecutePlanItemDialog({
  planItem,
  open,
  onOpenChange,
  onComplete
}: ExecutePlanItemDialogProps) {
  const [visit, setVisit] = useState<InspectionVisit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadVisit();
    }
  }, [planItem.id, open]);

  const loadVisit = async () => {
    try {
      setLoading(true);
      const existingVisit = await inspectionService.getVisitByPlanItemId(planItem.id);
      setVisit(existingVisit || null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVisitUpdate = (updatedVisit: InspectionVisit) => {
    setVisit(updatedVisit);
    if (updatedVisit.visitStatus === InspectionVisitStatus.COMPLETED) {
      onComplete();
    }
  };

  const hasVisit = !!visit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {planItem.employerName || planItem.areaName}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {planItem.plannedDate} • {planItem.territory}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <Tabs defaultValue="checkin" className="w-full">
            <TabsList className="flex w-full flex-wrap gap-1">
              <TabsTrigger value="checkin" className="text-xs sm:text-sm min-w-0">Check-in</TabsTrigger>
              <TabsTrigger value="employer" disabled={!hasVisit} className="text-xs sm:text-sm min-w-0">Employer</TabsTrigger>
              <TabsTrigger value="papers" disabled={!hasVisit} className="text-xs sm:text-sm min-w-0">Working Papers</TabsTrigger>
              <TabsTrigger value="evidence" disabled={!hasVisit} className="text-xs sm:text-sm min-w-0">Evidence</TabsTrigger>
              <TabsTrigger value="findings" disabled={!hasVisit} className="text-xs sm:text-sm min-w-0">Findings</TabsTrigger>
              <TabsTrigger value="violations" disabled={!hasVisit} className="text-xs sm:text-sm min-w-0">Violations</TabsTrigger>
              <TabsTrigger value="checkout" disabled={!hasVisit} className="text-xs sm:text-sm min-w-0">Check-out</TabsTrigger>
            </TabsList>

            <TabsContent value="checkin">
              <CheckInOutTabContent
                planItem={planItem}
                visit={visit}
                onVisitUpdate={handleVisitUpdate}
              />
            </TabsContent>

            {hasVisit && (
              <>
                <TabsContent value="employer">
                  <EmployerInteractionTabContent
                    visit={visit}
                    planItemId={planItem.id}
                  />
                </TabsContent>

                <TabsContent value="papers">
                  <WorkingPapersTabContent
                    visit={visit}
                    planItemId={planItem.id}
                  />
                </TabsContent>

                <TabsContent value="evidence">
                  <EvidenceTabContent visit={visit} />
                </TabsContent>

                <TabsContent value="findings">
                  <FindingsTabContent
                    visit={visit}
                    employerId={visit.employerId || planItem.employerId || ''}
                    planItem={planItem}
                  />
                </TabsContent>

                <TabsContent value="violations">
                  <ViolationsTabContent visit={visit} />
                </TabsContent>

                <TabsContent value="checkout">
                  <CheckOutCloseTabContent
                    visit={visit}
                    planItemId={planItem.id}
                    onVisitUpdate={handleVisitUpdate}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
