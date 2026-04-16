import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Clock, LogOut, MapPin, FileText, Search, AlertCircle } from 'lucide-react';
import { InspectionVisit, InspectionVisitStatus } from '@/types/inspectionTypes';
import { inspectionService } from '@/services/inspectionService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CheckOutCloseTabContentProps {
  visit: InspectionVisit;
  planItemId: string;
  onVisitUpdate: (visit: InspectionVisit) => void;
}

interface VisitSummary {
  duration: string;
  evidenceCount: number;
  findingsCount: number;
  violationsCount: number;
  workingPapersCompletion: number;
  employerAcknowledged: boolean;
  hasFindings: boolean;
  unconvertedViolations: number;
}

interface ValidationResult {
  canCheckOut: boolean;
  blockers: string[];
  warnings: string[];
}

export function CheckOutCloseTabContent({ visit, planItemId, onVisitUpdate }: CheckOutCloseTabContentProps) {
  const [checkOutLocation, setCheckOutLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState<string>('NONE');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<VisitSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, [visit.id]);

  const loadSummary = async () => {
    try {
      setSummaryLoading(true);

      // Fetch all related data in parallel
      const [evidenceRes, findingsRes, workingPapersRes, interactionRes] = await Promise.all([
        supabase.from('ce_inspection_evidence').select('id').eq('inspection_id', visit.id),
        supabase.from('ce_inspection_findings').select('id, finding_type, violation_created, explanation_if_no_violation').eq('inspection_id', visit.id),
        supabase.from('ce_inspection_working_papers').select('completion_percentage').eq('inspection_id', visit.id).maybeSingle(),
        supabase.from('ce_inspection_employer_interactions').select('employer_acknowledged').eq('inspection_id', visit.id).maybeSingle(),
      ]);

      const findings = findingsRes.data ?? [];
      const unconverted = findings.filter(
        f => f.finding_type === 'POSSIBLE_VIOLATION' && !f.violation_created && !f.explanation_if_no_violation
      ).length;

      // Calculate duration
      let duration = 'N/A';
      if (visit.checkInTime) {
        const checkIn = new Date(visit.checkInTime);
        const now = new Date();
        const diffMs = now.getTime() - checkIn.getTime();
        const hours = Math.floor(diffMs / 3600000);
        const minutes = Math.floor((diffMs % 3600000) / 60000);
        duration = `${hours}h ${minutes}m`;
      }

      setSummary({
        duration,
        evidenceCount: evidenceRes.data?.length ?? 0,
        findingsCount: findings.length,
        violationsCount: findings.filter(f => f.violation_created).length,
        workingPapersCompletion: workingPapersRes.data?.completion_percentage ?? 0,
        employerAcknowledged: interactionRes.data?.employer_acknowledged ?? false,
        hasFindings: findings.length > 0,
        unconvertedViolations: unconverted,
      });
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const getValidation = (): ValidationResult => {
    if (!summary) return { canCheckOut: false, blockers: ['Summary not loaded'], warnings: [] };

    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!summary.hasFindings) {
      blockers.push('At least one finding must be recorded before check-out');
    }
    if (summary.unconvertedViolations > 0) {
      blockers.push(`${summary.unconvertedViolations} possible violation(s) need conversion or explanation`);
    }
    if (summary.evidenceCount === 0) {
      warnings.push('No evidence has been attached to this visit');
    }
    if (summary.workingPapersCompletion < 40) {
      warnings.push(`Working papers only ${summary.workingPapersCompletion}% complete`);
    }
    if (!summary.employerAcknowledged) {
      warnings.push('Employer has not acknowledged the visit');
    }

    return { canCheckOut: blockers.length === 0, blockers, warnings };
  };

  const handleCheckOut = async () => {
    const validation = getValidation();
    if (!validation.canCheckOut) {
      toast.error('Cannot check out — resolve blockers first');
      return;
    }

    try {
      setLoading(true);
      const fullNotes = [
        notes,
        nextAction !== 'NONE' ? `Next Action: ${nextAction}` : '',
        followUpNotes ? `Follow-up: ${followUpNotes}` : '',
      ].filter(Boolean).join('\n');

      const updatedVisit = await inspectionService.checkOut(visit.id, {
        location: checkOutLocation,
        notes: fullNotes,
      });

      // Update plan item status
      await supabase
        .from('ce_weekly_plan_items')
        .update({
          execution_status: 'COMPLETED',
          check_out_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', planItemId);

      onVisitUpdate(updatedVisit);
      toast.success('Visit completed and checked out');
    } catch (error) {
      toast.error('Failed to check out');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (visit.visitStatus === InspectionVisitStatus.COMPLETED) {
    return (
      <div className="space-y-6 py-4">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Visit Completed</span>
        </div>
        <div className="space-y-2 text-sm">
          {visit.checkOutTime && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Checked out: {new Date(visit.checkOutTime).toLocaleString()}</span>
            </div>
          )}
          {visit.checkOutLocation && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{visit.checkOutLocation}</span>
            </div>
          )}
          {visit.notes && (
            <div className="mt-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">Final Notes:</div>
              <div className="text-sm whitespace-pre-wrap">{visit.notes}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const validation = getValidation();

  return (
    <div className="space-y-6 py-4">
      {/* Visit Summary Card */}
      {summaryLoading ? (
        <div className="py-4 text-center text-muted-foreground">Loading summary...</div>
      ) : summary && (
        <div className="p-4 border rounded-lg bg-accent/50">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Visit Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-2 rounded bg-background">
              <div className="text-lg font-bold">{summary.duration}</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
            <div className="text-center p-2 rounded bg-background">
              <div className="text-lg font-bold">{summary.evidenceCount}</div>
              <div className="text-xs text-muted-foreground">Evidence</div>
            </div>
            <div className="text-center p-2 rounded bg-background">
              <div className="text-lg font-bold">{summary.findingsCount}</div>
              <div className="text-xs text-muted-foreground">Findings</div>
            </div>
            <div className="text-center p-2 rounded bg-background">
              <div className="text-lg font-bold">{summary.violationsCount}</div>
              <div className="text-xs text-muted-foreground">Violations</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline" className={summary.workingPapersCompletion >= 80 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
              Papers: {summary.workingPapersCompletion}%
            </Badge>
            <Badge variant="outline" className={summary.employerAcknowledged ? 'bg-success/10 text-success' : 'bg-muted'}>
              {summary.employerAcknowledged ? 'Acknowledged' : 'Not Acknowledged'}
            </Badge>
          </div>
        </div>
      )}

      {/* Validation Blockers */}
      {validation.blockers.length > 0 && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-medium text-sm">
            <AlertTriangle className="h-4 w-4" />
            Cannot check out — resolve these issues:
          </div>
          <ul className="list-disc list-inside text-sm text-destructive space-y-1">
            {validation.blockers.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      )}

      {/* Validation Warnings */}
      {validation.warnings.length > 0 && (
        <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 space-y-2">
          <div className="flex items-center gap-2 text-warning font-medium text-sm">
            <AlertCircle className="h-4 w-4" />
            Warnings (you can still check out):
          </div>
          <ul className="list-disc list-inside text-sm text-warning space-y-1">
            {validation.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Check-out Form */}
      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="font-medium flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Check-out Details
        </h3>

        <div className="space-y-2">
          <Label>Location (Optional)</Label>
          <Input
            value={checkOutLocation}
            onChange={(e) => setCheckOutLocation(e.target.value)}
            placeholder="Check-out location or GPS"
          />
        </div>

        <div className="space-y-2">
          <Label>Final Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Visit summary and key observations..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Next Action</Label>
          <Select value={nextAction} onValueChange={setNextAction}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No Follow-up Required</SelectItem>
              <SelectItem value="FOLLOW_UP_VISIT">Schedule Follow-up Visit</SelectItem>
              <SelectItem value="DOCUMENT_REQUEST">Request Additional Documents</SelectItem>
              <SelectItem value="ESCALATION">Escalate to Supervisor</SelectItem>
              <SelectItem value="LEGAL_REFERRAL">Refer to Legal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {nextAction !== 'NONE' && (
          <div className="space-y-2">
            <Label>Follow-up Details</Label>
            <Textarea
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
              placeholder="Describe the follow-up action required..."
              rows={2}
            />
          </div>
        )}
      </div>

      {/* Check-out Button */}
      <Button
        onClick={handleCheckOut}
        disabled={loading || !validation.canCheckOut}
        className="w-full"
        size="lg"
      >
        <LogOut className="h-4 w-4 mr-2" />
        {loading ? 'Checking out...' : 'Check Out & Complete Visit'}
      </Button>
    </div>
  );
}
