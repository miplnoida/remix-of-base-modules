import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface StatusTransition {
  code: string;
  description: string;
}

interface IPStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uniqueUuid: string;
  currentStatus: string;
  ssn?: string | null;
  personName?: string;
  onStatusChanged: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  'Z': 'Draft',
  'P': 'Pending',
  'V': 'Verified',
  'A': 'Active',
  'S': 'Suspended',
  'T': 'Terminated',
  'D': 'Deleted',
  'I': 'Inactive',
  'E': 'E-Verified',
  'C': 'Deceased',
};

const STATUS_COLORS: Record<string, string> = {
  'Z': 'bg-muted text-muted-foreground',
  'P': 'bg-accent/30 text-accent-foreground',
  'V': 'bg-secondary/10 text-secondary',
  'A': 'bg-primary/10 text-primary',
  'S': 'bg-accent/30 text-accent-foreground',
  'T': 'bg-destructive/10 text-destructive',
  'D': 'bg-muted text-muted-foreground',
  'I': 'bg-muted text-muted-foreground',
  'E': 'bg-secondary/10 text-secondary',
  'C': 'bg-muted text-muted-foreground',
};

export function IPStatusChangeDialog({
  open,
  onOpenChange,
  uniqueUuid,
  currentStatus,
  ssn,
  personName,
  onStatusChanged,
}: IPStatusChangeDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allowedTransitions, setAllowedTransitions] = useState<StatusTransition[]>([]);
  const [canChange, setCanChange] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch allowed transitions when dialog opens
  useEffect(() => {
    if (open && currentStatus) {
      fetchAllowedTransitions();
    }
  }, [open, currentStatus]);

  const fetchAllowedTransitions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_ip_status_transitions', {
        p_current_status: currentStatus,
      });

      if (rpcError) throw rpcError;

      const result = data as unknown as { 
        current_status: string; 
        can_change: boolean; 
        allowed_transitions: StatusTransition[] 
      };
      
      setCanChange(result.can_change);
      setAllowedTransitions(result.allowed_transitions || []);
      setSelectedStatus('');
    } catch (err) {
      console.error('Error fetching transitions:', err);
      setError('Failed to load status options');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedStatus || !canChange) return;

    setSubmitting(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('change_ip_status', {
        p_unique_uuid: uniqueUuid,
        p_new_status: selectedStatus,
        p_current_status: currentStatus,
        p_user_id: user?.id || null,
        p_user_code: user?.name || null,
      });

      if (rpcError) throw rpcError;

      const result = data as unknown as {
        success: boolean;
        error?: string;
        message: string;
        old_status?: string;
        new_status?: string;
        current_status?: string;
      };

      if (!result.success) {
        if (result.error === 'STATUS_CHANGED') {
          setError(result.message);
          // Refresh allowed transitions
          await fetchAllowedTransitions();
        } else {
          setError(result.message);
        }
        return;
      }

      toast.success(result.message);
      onOpenChange(false);
      onStatusChanged();
    } catch (err: any) {
      console.error('Error changing status:', err);
      setError(err.message || 'Failed to change status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setSelectedStatus('');
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Insured Person Status</DialogTitle>
          <DialogDescription>
            {personName && <span className="font-medium">{personName}</span>}
            {ssn && <span className="text-muted-foreground"> (SSN: {ssn})</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status Display */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Current Status:</span>
            <Badge className={STATUS_COLORS[currentStatus] || 'bg-muted'}>
              {STATUS_LABELS[currentStatus] || currentStatus}
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading options...</span>
            </div>
          ) : !canChange ? (
            <div className="flex flex-col items-center py-6 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Status changes are not allowed for records with status{' '}
                <Badge variant="outline" className="mx-1">
                  {STATUS_LABELS[currentStatus] || currentStatus}
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {currentStatus === 'P' && 'Pending records must be processed through the workflow.'}
                {currentStatus === 'Z' && 'Draft records must be submitted first.'}
                {currentStatus === 'T' && 'Terminated records cannot be changed.'}
                {currentStatus === 'D' && 'Deleted records cannot be changed.'}
              </p>
            </div>
          ) : (
            <>
              {/* Status Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select New Status:</Label>
                <RadioGroup
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                  className="space-y-2"
                >
                  {allowedTransitions.map((transition) => (
                    <div
                      key={transition.code}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedStatus === transition.code
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedStatus(transition.code)}
                    >
                      <RadioGroupItem value={transition.code} id={`status-${transition.code}`} />
                      <Label
                        htmlFor={`status-${transition.code}`}
                        className="flex-1 cursor-pointer flex items-center justify-between"
                      >
                        <span>{transition.description}</span>
                        <Badge className={STATUS_COLORS[transition.code] || 'bg-muted'}>
                          {transition.code}
                        </Badge>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Warning for Terminated status */}
              {selectedStatus === 'T' && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-destructive">Termination Notice</p>
                      <p className="text-muted-foreground mt-1">
                        Setting status to Terminated will set the termination date to today and
                        termination code to 1. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="text-sm">
                  <p className="text-destructive">{error}</p>
                  {error.includes('changed by another user') && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto mt-1"
                      onClick={fetchAllowedTransitions}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh options
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            {canChange ? 'Cancel' : 'Close'}
          </Button>
          {canChange && (
            <Button
              onClick={handleConfirm}
              disabled={!selectedStatus || submitting}
              className="min-w-[100px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
