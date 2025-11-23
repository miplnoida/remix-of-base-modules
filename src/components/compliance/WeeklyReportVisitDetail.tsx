import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  WeeklyPlanItem, 
  InspectionVisit, 
  InspectionEvidence, 
  InspectionFinding,
  FindingType 
} from '@/types/inspectionTypes';
import { Violation } from '@/types/violation';
import { weeklyReportService } from '@/services/weeklyReportService';
import { 
  Clock, 
  MapPin, 
  Image, 
  FileText, 
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WeeklyReportVisitDetailProps {
  planItem: WeeklyPlanItem;
  onClose: () => void;
}

export function WeeklyReportVisitDetail({ planItem, onClose }: WeeklyReportVisitDetailProps) {
  const { toast } = useToast();
  const [visit, setVisit] = useState<InspectionVisit | null>(null);
  const [evidence, setEvidence] = useState<InspectionEvidence[]>([]);
  const [findings, setFindings] = useState<InspectionFinding[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisitDetails();
  }, [planItem.id]);

  const loadVisitDetails = async () => {
    setLoading(true);
    try {
      const visitData = await weeklyReportService.getVisitByPlanItemId(planItem.id);
      if (visitData) {
        setVisit(visitData);
        const evidenceData = await weeklyReportService.getEvidenceForVisit(visitData.id);
        const findingsData = await weeklyReportService.getFindingsForVisit(visitData.id);
        const violationsData = await weeklyReportService.getViolationsForVisit(visitData.id);
        
        setEvidence(evidenceData);
        setFindings(findingsData);
        setViolations(violationsData);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load visit details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const hasNoFindings = visit && findings.length === 0;
  const hasPossibleViolationsWithoutRecords = findings.some(
    f => f.findingType === FindingType.POSSIBLE_VIOLATION && !f.isViolationCreated
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-600 bg-red-50';
      case 'High': return 'text-orange-600 bg-orange-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'Low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Visit Details: {planItem.employerName || planItem.areaName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-4">
            {/* Visit Information */}
            {visit && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Visit Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Check-in:</span>
                      <span className="ml-2 font-medium">{visit.checkInTime || 'Not recorded'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Check-out:</span>
                      <span className="ml-2 font-medium">{visit.checkOutTime || 'Not recorded'}</span>
                    </div>
                  </div>
                  {visit.visitNotes && (
                    <div>
                      <span className="text-sm text-muted-foreground">Notes:</span>
                      <p className="mt-1 text-sm">{visit.visitNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Prompts/Warnings */}
            {hasNoFindings && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">No findings recorded for this visit</div>
                  <div className="text-sm mb-3">
                    Do you want to add findings before submitting your weekly report?
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">Add Finding</Button>
                    <Button size="sm" variant="outline">Mark as No Findings</Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {hasPossibleViolationsWithoutRecords && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <div className="font-medium mb-2 text-orange-900">
                    Possible violations not converted to violation records
                  </div>
                  <div className="text-sm mb-3 text-orange-800">
                    Some findings are marked as possible violations but no violation records were created.
                    Do you want to review and create violations now?
                  </div>
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                    Review & Create Violations
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Evidence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Evidence ({evidence.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {evidence.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No evidence uploaded
                  </div>
                ) : (
                  <div className="space-y-2">
                    {evidence.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded">
                            <Image className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{item.fileName}</div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground">{item.description}</div>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">{item.type}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Findings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Findings ({findings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {findings.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No findings recorded
                  </div>
                ) : (
                  <div className="space-y-3">
                    {findings.map((finding) => (
                      <div
                        key={finding.id}
                        className="p-4 border rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{finding.findingType}</Badge>
                              {finding.severity && (
                                <Badge className={getSeverityColor(finding.severity)}>
                                  {finding.severity}
                                </Badge>
                              )}
                            </div>
                            <div className="font-medium mb-1">{finding.category}</div>
                            <div className="text-sm text-muted-foreground">
                              {finding.description}
                            </div>
                          </div>
                          {finding.findingType === FindingType.POSSIBLE_VIOLATION && (
                            <div>
                              {finding.isViolationCreated ? (
                                <Badge className="bg-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Violation Created
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  No Violation
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Violations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Violations Created ({violations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {violations.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No violations created from this visit
                  </div>
                ) : (
                  <div className="space-y-2">
                    {violations.map((violation) => (
                      <div
                        key={violation.id}
                        className="p-3 border rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{violation.violationNumber}</div>
                          <Badge className={getSeverityColor(violation.severity)}>
                            {violation.severity}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {violation.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
