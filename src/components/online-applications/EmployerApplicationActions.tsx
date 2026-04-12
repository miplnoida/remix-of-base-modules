import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import {
  useConvertToEmployerRegistration,
  validateEmployerApplicationForConversion,
} from '@/hooks/useConvertToEmployerRegistration';
import { triggerEmployerRegistrationWorkflow } from '@/services/employerWorkflowTriggerService';
import { logAuditTrail } from '@/services/auditService';

interface EmployerApplicationActionsProps {
  applicationData: Record<string, any> | null;
  applicationId: string;
  meeting?: {
    id: string;
    status: string;
    workflow_instance_id?: string;
  } | null;
  /** Workflow instance from WorkflowActionButtons context (when no meeting) */
  workflowInstanceId?: string | null;
  onActionComplete: () => void;
}

export function EmployerApplicationActions({
  applicationData,
  applicationId,
  meeting,
  workflowInstanceId,
  onActionComplete,
}: EmployerApplicationActionsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSupabaseAuth();
  const { userCode } = useUserCode();

  const { convert: convertToEmployer, isConverting } = useConvertToEmployerRegistration();

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const effectiveWorkflowInstanceId = meeting?.workflow_instance_id || workflowInstanceId;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['meetings'] });
    queryClient.invalidateQueries({ queryKey: ['meeting-details'] });
    queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
    queryClient.invalidateQueries({ queryKey: ['workflow-actions'] });
    queryClient.invalidateQueries({ queryKey: ['application-workflow-status'] });
    queryClient.invalidateQueries({ queryKey: ['online-applications'] });
    queryClient.invalidateQueries({ queryKey: ['employer-applications'] });
    onActionComplete();
  };

  // ── ACCEPT ──────────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!applicationData) {
      toast.error('Application data is not available');
      return;
    }

    // 1. Validate
    const validationErrors = validateEmployerApplicationForConversion(applicationData);
    if (validationErrors.length > 0) {
      toast.error('Validation failed', {
        description: validationErrors[0].message,
        duration: 6000,
      });
      return;
    }

    setIsProcessing(true);
    try {
      // 2. Convert application to er_master
      const result = await convertToEmployer({
        applicationData,
        userId: user?.id || '',
        userCode: userCode || '',
        applicationReference: applicationId,
        meetingId: meeting?.id,
      });

      if (!result.success) {
        setIsProcessing(false);
        return; // convertToEmployer already shows toast
      }

      const employerRegno = result.regno || null;
      const employerName =
        applicationData.name || applicationData.employer_name || employerRegno;

      toast.success(
        result.message || `Employer Registration ${result.regno} created successfully.`,
        { duration: 8000 }
      );

      // 3. Close meeting/workflow
      if (meeting?.id) {
        // Use edge function — same path as StartMeetingPage
        const { error: closeErr } = await supabase.functions.invoke(
          'meeting-api-handler',
          {
            body: {
              action: 'close_meeting_approved',
              meetingId: meeting.id,
              remarks: approvalRemarks || undefined,
              employerRegno,
              employerName: employerName || employerRegno,
            },
          }
        );
        if (closeErr) {
          console.error('Failed to close meeting:', closeErr);
          // Non-blocking — conversion already succeeded
        }
      } else if (effectiveWorkflowInstanceId) {
        // No meeting — directly close workflow instance
        const now = new Date().toISOString();
        await supabase
          .from('workflow_instances')
          .update({ status: 'Approved', completed_at: now })
          .eq('id', effectiveWorkflowInstanceId);

        await supabase
          .from('workflow_tasks')
          .update({ status: 'Completed', completed_at: now })
          .eq('instance_id', effectiveWorkflowInstanceId)
          .in('status', ['Pending', 'InProgress']);

        await supabase.from('workflow_logs').insert({
          instance_id: effectiveWorkflowInstanceId,
          action: 'Approved',
          old_status: 'InProgress',
          new_status: 'Approved',
          user_id: user?.id || null,
          user_name: userCode || 'System',
          comments: approvalRemarks || 'Application approved from detail page',
        });

        // Trigger next workflow
        if (employerRegno) {
          try {
            const nextWfId = await triggerEmployerRegistrationWorkflow(
              employerRegno,
              employerName || employerRegno,
              user?.id
            );
            if (nextWfId) {
              toast.success('Employer Registration Approval Workflow initiated automatically.', { duration: 5000 });
            }
          } catch (triggerErr) {
            console.error('Failed to trigger employer approval workflow:', triggerErr);
          }
        }
      }

      // 4. Audit
      await logAuditTrail({
        action: 'employer_application_accepted',
        entity_type: 'online-employer-application',
        entity_id: applicationId,
        new_value: JSON.stringify({ regno: employerRegno, remarks: approvalRemarks }),
      });

      invalidateAll();
      setApproveDialogOpen(false);

      // Navigate to newly created employer registration
      if (employerRegno) {
        navigate(`/employer-registration/view/${employerRegno}`);
      }
    } catch (err) {
      console.error('Accept failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to accept application');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── REJECT ──────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectRemarks.trim()) {
      toast.error('Please provide rejection remarks');
      return;
    }

    setIsProcessing(true);
    try {
      const now = new Date().toISOString();

      if (meeting?.id) {
        // Close meeting with rejection via direct Supabase queries
        await supabase
          .from('meetings')
          .update({
            status: 'Closed',
            outcome: 'ClosedWithRejection',
            outcome_remarks: rejectRemarks.trim(),
            closed_at: now,
            updated_at: now,
          })
          .eq('id', meeting.id);

        await supabase.from('meeting_history').insert({
          meeting_id: meeting.id,
          old_status: meeting.status,
          new_status: 'Closed',
          action_taken: 'Closed with Rejection',
          outcome: 'ClosedWithRejection',
          remarks: rejectRemarks.trim(),
          performed_at: now,
        });
      }

      // Close workflow if linked
      if (effectiveWorkflowInstanceId) {
        await supabase
          .from('workflow_instances')
          .update({ status: 'Rejected', completed_at: now })
          .eq('id', effectiveWorkflowInstanceId);

        await supabase
          .from('workflow_tasks')
          .update({ status: 'Completed', completed_at: now })
          .eq('instance_id', effectiveWorkflowInstanceId)
          .in('status', ['Pending', 'InProgress']);

        await supabase.from('workflow_logs').insert({
          instance_id: effectiveWorkflowInstanceId,
          action: 'Rejected',
          old_status: 'InProgress',
          new_status: 'Rejected',
          user_id: user?.id || null,
          user_name: userCode || 'System',
          comments: rejectRemarks.trim(),
        });
      }

      // Audit
      await logAuditTrail({
        action: 'employer_application_rejected',
        entity_type: 'online-employer-application',
        entity_id: applicationId,
        new_value: JSON.stringify({ remarks: rejectRemarks.trim() }),
      });

      toast.success('Application rejected successfully');
      invalidateAll();
      setRejectDialogOpen(false);
      navigate(-1 as any);
    } catch (err) {
      console.error('Reject failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to reject application');
    } finally {
      setIsProcessing(false);
    }
  };

  const busy = isConverting || isProcessing;

  return (
    <>
      <Button
        variant="default"
        className="gap-2 bg-green-600 hover:bg-green-700 text-white"
        onClick={() => setApproveDialogOpen(true)}
        disabled={busy}
      >
        <CheckCircle2 className="h-4 w-4" />
        Accept
      </Button>
      <Button
        variant="destructive"
        className="gap-2"
        onClick={() => setRejectDialogOpen(true)}
        disabled={busy}
      >
        <XCircle className="h-4 w-4" />
        Reject
      </Button>

      {/* Accept Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Employer Application</DialogTitle>
            <DialogDescription>
              This will convert the application into an employer registration record and trigger the approval workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="approval-remarks">Remarks (optional)</Label>
            <Textarea
              id="approval-remarks"
              placeholder="Add any approval remarks..."
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
              onClick={handleAccept}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Employer Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="reject-remarks">Rejection Remarks *</Label>
            <Textarea
              id="reject-remarks"
              placeholder="Reason for rejection..."
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={busy || !rejectRemarks.trim()} className="gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
