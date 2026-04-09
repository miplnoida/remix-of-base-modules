import { Loader2 } from 'lucide-react';
import { useGlobalBlocking } from '@/contexts/GlobalBlockingContext';

export function BlockingOverlay() {
  const { isBlocking, blockingLabel } = useGlobalBlocking();

  if (!isBlocking) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 pointer-events-auto">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-6 shadow-xl border">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">
          {blockingLabel || 'Processing...'}
        </p>
      </div>
    </div>
  );
}
