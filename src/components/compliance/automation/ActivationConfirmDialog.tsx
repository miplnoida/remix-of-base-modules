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
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Archive } from 'lucide-react';

interface ActivationConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  jobName: string;
  warnings: string[];
  isDeprecated: boolean;
}

export const ActivationConfirmDialog: React.FC<ActivationConfirmDialogProps> = ({
  open, onOpenChange, onConfirm, jobName, warnings, isDeprecated,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isDeprecated ? <Archive className="h-5 w-5 text-muted-foreground" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
            {isDeprecated ? 'Reactivate Deprecated Job?' : 'Activation Warning'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                {isDeprecated
                  ? `"${jobName}" has been deprecated and superseded. Reactivating it may cause conflicts with the canonical replacement.`
                  : `Review the following before enabling "${jobName}":`}
              </p>
              {warnings.length > 0 && (
                <ul className="space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
              {isDeprecated && (
                <Badge variant="outline" className="border-dashed text-muted-foreground">
                  This action is not recommended for production use
                </Badge>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {isDeprecated ? 'Reactivate Anyway' : 'Enable Job'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
