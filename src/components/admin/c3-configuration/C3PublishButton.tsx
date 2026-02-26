import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useC3SyncStatus, usePublishToC3Wizard } from '@/hooks/useC3ConfigPublish';
import { formatDisplayDate } from '@/lib/dateFormat';

export function C3PublishButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const { data: syncStatus, isLoading: statusLoading } = useC3SyncStatus();
  const publishMutation = usePublishToC3Wizard();

  const handlePublish = async () => {
    setShowConfirm(false);
    await publishMutation.mutateAsync();
  };

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Pending changes indicator */}
        {!statusLoading && syncStatus && (
          syncStatus.hasPendingChanges ? (
            <Badge variant="destructive" className="flex items-center gap-1.5 py-1 px-3">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Changes Pending Sync</span>
            </Badge>
          ) : syncStatus.lastPublishedAt ? (
            <Badge variant="outline" className="flex items-center gap-1.5 py-1 px-3 bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Synced {formatDisplayDate(syncStatus.lastPublishedAt)}</span>
            </Badge>
          ) : null
        )}

        <Button
          onClick={() => setShowConfirm(true)}
          disabled={publishMutation.isPending}
          className="flex items-center gap-2"
        >
          {publishMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {publishMutation.isPending ? 'Publishing...' : 'Publish to C3-Wizard'}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish C3 Configuration to C3-Wizard?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will sync all active C3 configuration data to the C3-Wizard system used by employers for C3 generation.
              </p>
              {syncStatus && (
                <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                  <p className="font-medium text-foreground">Payload Summary:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                    <li>{syncStatus.pendingCounts.periods} period configuration(s) pending</li>
                    <li>{syncStatus.pendingCounts.slabs} levy slab(s) pending</li>
                    
                  </ul>
                </div>
              )}
              <p className="text-sm font-medium text-destructive">
                This action will update calculation parameters in the employer system. Please ensure all values are correct before publishing.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>
              Yes, Publish to C3-Wizard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
