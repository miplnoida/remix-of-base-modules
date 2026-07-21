/**
 * CH-SIMPLE-P3G — Deprecated Route Banner.
 *
 * Displayed on legacy Communication Hub pages that remain reachable for
 * bookmarks and diagnostics but are no longer the recommended workflow.
 * The normal path for preparing, testing, and certifying a communication
 * event is `/admin/communication-hub/go-live`.
 */
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export interface DeprecatedRouteBannerProps {
  /** Short label describing the legacy workflow (e.g. "Pilots"). */
  legacyLabel: string;
  /** Optional module/event context to preserve into the Go Live deep link. */
  module?: string;
  event?: string;
  /** Optional message body override. */
  message?: string;
  /** If true, the banner is styled as a technical-diagnostic notice, not a normal deprecation. */
  variant?: "deprecated" | "diagnostic";
}

export default function DeprecatedRouteBanner({
  legacyLabel,
  module,
  event,
  message,
  variant = "deprecated",
}: DeprecatedRouteBannerProps) {
  const params = new URLSearchParams();
  if (module) params.set("module", module);
  if (event) params.set("event", event);
  const goLiveHref = `/admin/communication-hub/go-live${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const isDiagnostic = variant === "diagnostic";

  return (
    <Alert
      variant="default"
      className={
        isDiagnostic
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-orange-300 bg-orange-50 text-orange-900"
      }
      data-testid="deprecated-route-banner"
      data-variant={variant}
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-semibold">
        {isDiagnostic
          ? `${legacyLabel} — technical diagnostic workspace`
          : `${legacyLabel} is a legacy workflow`}
      </AlertTitle>
      <AlertDescription className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {message ??
            (isDiagnostic
              ? "This page is retained for authorised technical investigation. Use Go Live for the normal event preparation, testing, and certification process."
              : "This workflow has moved. Use Go Live for the normal event preparation, testing, and certification process.")}
        </span>
        <Button asChild size="sm" variant="default">
          <Link to={goLiveHref} aria-label="Open Go Live">
            Open Go Live
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
