import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dateFormat';

export interface SplitAnalysis {
  action: 'normal' | 'split' | 'error';
  message?: string;
  old_record_id?: string;
  old_record_original_from?: string;
  old_record_original_to?: string;
  old_record_new_end?: string;
  new_record_start?: string;
  new_record_end?: string;
}

interface C3SplitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: SplitAnalysis | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function C3SplitConfirmDialog({
  open,
  onOpenChange,
  analysis,
  onConfirm,
  isLoading = false,
}: C3SplitConfirmDialogProps) {
  if (!analysis) return null;

  const formatDate = (d?: string) => {
    if (!d || d === 'open-ended') return 'Open-ended';
    try { return formatDisplayDate(d); } catch { return d; }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Historical Configuration — Split Required
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm">
              <p>{analysis.message}</p>

              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
                {/* Old record */}
                <div className="p-3 rounded-lg bg-muted border">
                  <p className="font-medium text-foreground mb-1">Existing Record</p>
                  <p className="text-muted-foreground">
                    {formatDate(analysis.old_record_original_from)} – {formatDate(analysis.old_record_original_to)}
                  </p>
                  <p className="text-xs mt-1 text-amber-600 font-medium">
                    Will be truncated to end on {formatDate(analysis.old_record_new_end)}
                  </p>
                </div>

                <ArrowRight className="h-5 w-5 text-muted-foreground mt-6" />

                {/* New record */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="font-medium text-foreground mb-1">New Record</p>
                  <p className="text-muted-foreground">
                    {formatDate(analysis.new_record_start)} – {formatDate(analysis.new_record_end)}
                  </p>
                  <p className="text-xs mt-1 text-primary font-medium">
                    Created with your updated values
                  </p>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isLoading ? 'Processing...' : 'Confirm Split'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
