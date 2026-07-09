import React, { useSyncExternalStore } from 'react';
import { isComplianceDbFlagEnabled } from '@/lib/compliance/featureToggles';
import {
  hasComplianceDbFlagsLoaded,
  subscribeComplianceDbFlags,
  getComplianceDbFlag,
} from '@/lib/compliance/featureFlagCache';
import FeatureDisabled from '@/pages/compliance/FeatureDisabled';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Phase 1/2 feature-flag route wrapper.
 *
 * Wraps a route element so that:
 *   - when the given DB feature_flags.flag_key is OFF -> render <FeatureDisabled/>
 *   - when the gated child throws -> render a local "feature unavailable" card
 *     (so a per-feature crash never escapes to the global ErrorBoundary).
 *
 * Subscribes to the compliance feature-flag cache via useSyncExternalStore so
 * toggling a flag from Setup → Feature Toggles re-evaluates the gate WITHOUT
 * requiring a route change or page refresh. This is what makes repeated
 * ON/OFF cycles consistent (Phase 2 route sweep fix).
 *
 * Fail-open: while the cache is still loading, children render so transient
 * load failures never blank the UI. Permission gating remains the
 * responsibility of ProtectedLayout / PermissionWrapper.
 */
interface Props {
  flagKey: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function FeatureCrashFallback({ title, error }: { title: string; error: Error | null }) {
  // Surface the underlying error so it can be diagnosed / reported. Without
  // this, a generic "temporarily unavailable" card hid real bugs (missing
  // permissions, network failures, undefined access) from users and QA.
  const detail = error?.message?.trim();

  // Stale-chunk auto-recovery: when a deploy replaces hashed asset filenames,
  // any tab still holding the previous index.html will try to fetch a chunk
  // that no longer exists and throw "Failed to fetch dynamically imported
  // module". Reload once automatically so the user gets the new bundle
  // without having to click Reload themselves. Guarded via sessionStorage so
  // a genuinely broken chunk can't cause an infinite reload loop.
  React.useEffect(() => {
    if (!detail) return;
    const isDynamicImportFailure =
      /Failed to fetch dynamically imported module/i.test(detail) ||
      /Importing a module script failed/i.test(detail) ||
      /error loading dynamically imported module/i.test(detail);
    if (!isDynamicImportFailure) return;
    const guardKey = 'lovable:chunk-reload-attempted';
    if (sessionStorage.getItem(guardKey)) return;
    sessionStorage.setItem(guardKey, String(Date.now()));
    window.location.reload();
  }, [detail]);

  return (
    <div className="p-6">
      <Card className="max-w-3xl border-amber-500/40">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <CardTitle>{title} is temporarily unavailable</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This feature failed to load. The rest of the application is still
            working — please reload the page or try again shortly.
          </p>
          {detail && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Error detail</p>
              <p className="font-mono text-xs text-foreground/80 break-words">{detail}</p>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => {
            sessionStorage.removeItem('lovable:chunk-reload-attempted');
            window.location.reload();
          }}>
            Reload
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


export const ComplianceFeatureGate: React.FC<Props> = ({
  flagKey,
  title,
  description,
  children,
}) => {
  // Re-render whenever any compliance DB flag changes. Snapshot encodes both
  // load status and the specific flag value so React detects toggles.
  useSyncExternalStore(
    subscribeComplianceDbFlags,
    () => `${hasComplianceDbFlagsLoaded() ? 'L' : 'P'}:${String(getComplianceDbFlag(flagKey))}`,
    () => `P:undefined`,
  );

  if (hasComplianceDbFlagsLoaded() && !isComplianceDbFlagEnabled(flagKey)) {
    return <FeatureDisabled title={title} flagKey={flagKey} description={description} />;
  }

  return (
    <ErrorBoundary fallback={(error) => <FeatureCrashFallback title={title} error={error} />}>
      {children}
    </ErrorBoundary>
  );
};

export default ComplianceFeatureGate;
