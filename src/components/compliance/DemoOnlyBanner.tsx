import { AlertTriangle } from "lucide-react";

interface DemoOnlyBannerProps {
  /** Short reason this screen is still demo / non-production data. */
  reason?: string;
  /** When real data wiring lands (e.g. "Delivery 5"). */
  replacedIn?: string;
}

/**
 * Yellow banner marking a Compliance screen as still demo-only.
 * Required by Delivery 3 of the Compliance & Enforcement restructure:
 * any screen that cannot yet show real Supabase-backed data must render
 * this banner near the top so testers do not mistake it for live behavior.
 */
export function DemoOnlyBanner({ reason, replacedIn }: DemoOnlyBannerProps) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium">Demo data only — not production-backed.</p>
        {reason && <p className="opacity-90">{reason}</p>}
        {replacedIn && (
          <p className="opacity-75">Real data wiring planned for {replacedIn}.</p>
        )}
      </div>
    </div>
  );
}

export default DemoOnlyBanner;
