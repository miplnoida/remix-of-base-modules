import { WeeklyPlanItem, InspectionVisitStatus } from '@/types/inspectionTypes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Image,
  FileText,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { RescheduleVisitDialog } from './RescheduleVisitDialog';
import { useState, useEffect } from 'react';
import { weeklyReportService } from '@/services/weeklyReportService';

interface WeeklyReportVisitRowProps {
  planItem: WeeklyPlanItem;
  onClick: () => void;
  onRefresh: () => void;
}

export function WeeklyReportVisitRow({ planItem, onClick, onRefresh }: WeeklyReportVisitRowProps) {
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [hasEvidence, setHasEvidence] = useState(false);
  const [hasFindings, setHasFindings] = useState(false);
  const [hasViolations, setHasViolations] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisitDetails();
  }, [planItem.id]);

  const loadVisitDetails = async () => {
    setLoading(true);
    try {
      const visit = await weeklyReportService.getVisitByPlanItemId(planItem.id);
      if (visit) {
        const evidence = await weeklyReportService.getEvidenceForVisit(visit.id);
        const findings = await weeklyReportService.getFindingsForVisit(visit.id);
        const violations = await weeklyReportService.getViolationsForVisit(visit.id);
        
        setHasEvidence(evidence.length > 0);
        setHasFindings(findings.length > 0);
        setHasViolations(violations.length > 0);
      }
    } catch (error) {
      console.error('Error loading visit details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (planItem.status) {
      case InspectionVisitStatus.COMPLETED:
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case InspectionVisitStatus.RESCHEDULED:
        return <Badge className="bg-blue-600"><RefreshCw className="h-3 w-3 mr-1" />Rescheduled</Badge>;
      case InspectionVisitStatus.NOT_DONE:
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Not Done</Badge>;
      case InspectionVisitStatus.IN_PROGRESS:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Planned</Badge>;
    }
  };

  const getTerritoryColor = (territory: string) => {
    return territory === 'St Kitts' ? 'text-blue-600' : 'text-green-600';
  };

  const canReschedule = planItem.status !== InspectionVisitStatus.COMPLETED && 
                         planItem.status !== InspectionVisitStatus.RESCHEDULED;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                {planItem.itemType === 'EMPLOYER_VISIT' ? (
                  <Building2 className="h-5 w-5 text-primary" />
                ) : (
                  <MapPin className="h-5 w-5 text-primary" />
                )}
                <h3 className="font-semibold text-lg">
                  {planItem.employerName || planItem.areaName}
                </h3>
                {getStatusBadge()}
                <Badge variant="outline" className={getTerritoryColor(planItem.territory)}>
                  {planItem.territory}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{planItem.visitDate}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{planItem.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Image className={`h-4 w-4 ${hasEvidence ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={hasEvidence ? 'text-green-600 font-medium' : 'text-gray-400'}>
                    Evidence
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className={`h-4 w-4 ${hasFindings ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className={hasFindings ? 'text-green-600 font-medium' : 'text-gray-400'}>
                    Findings
                  </span>
                </div>
              </div>

              {planItem.status === InspectionVisitStatus.RESCHEDULED && (
                <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-md text-sm">
                  <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900">Rescheduled to: {planItem.rescheduledTo}</div>
                    <div className="text-blue-700">Reason: {planItem.rescheduleReason}</div>
                  </div>
                </div>
              )}

              {planItem.status === InspectionVisitStatus.NOT_DONE && (
                <div className="flex items-start gap-2 p-2 bg-red-50 rounded-md text-sm">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-900">Not Done</div>
                    <div className="text-red-700">Reason: {planItem.notDoneReason}</div>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                Purpose: {planItem.purpose}
              </div>
            </div>

            {canReschedule && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRescheduleDialog(true);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reschedule
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showRescheduleDialog && (
        <RescheduleVisitDialog
          planItem={planItem}
          onClose={() => setShowRescheduleDialog(false)}
          onSuccess={() => {
            setShowRescheduleDialog(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
