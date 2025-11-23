import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WeeklyPlanItem, InspectionVisit, InspectionVisitStatus } from '@/types/inspectionTypes';
import { CheckInOutTabContent } from './inspection/CheckInOutTabContent';
import { EvidenceTabContent } from './inspection/EvidenceTabContent';
import { FindingsTabContent } from './inspection/FindingsTabContent';
import { ViolationsTabContent } from './inspection/ViolationsTabContent';
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
    loadVisit();
  }, [planItem.id]);

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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="checkin">Check-in/out</TabsTrigger>
              <TabsTrigger value="evidence" disabled={!visit}>Evidence</TabsTrigger>
              <TabsTrigger value="findings" disabled={!visit}>Findings</TabsTrigger>
              <TabsTrigger value="violations" disabled={!visit}>Violations</TabsTrigger>
            </TabsList>

            <TabsContent value="checkin">
              <CheckInOutTabContent
                planItem={planItem}
                visit={visit}
                onVisitUpdate={handleVisitUpdate}
              />
            </TabsContent>

            {visit && (
              <>
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
              </>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
