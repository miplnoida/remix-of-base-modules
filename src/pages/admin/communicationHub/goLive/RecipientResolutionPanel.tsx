/**
 * CH-SIMPLE-P3F-UX.5 — Recipient resolution panel.
 *
 * Renders the outcome of `resolveGoLiveRecipient` as an operator-friendly
 * card. When the policy exposes multiple approved named recipients, the
 * operator picks one here — resolution then becomes
 * `operator_selected_approved_recipient` and readiness re-runs against the
 * canonical evaluator with that address.
 *
 * IMPORTANT: this panel never invents a canonical decision. It only tells
 * the user what needs to happen before the server can be asked.
 */
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle, CheckCircle2, RefreshCw, Wrench } from "lucide-react";
import type { GoLiveRecipientResolution } from "./resolveTestRecipient";
import { maskEmailForDisplay } from "./resolveTestRecipient";

const REASON_TITLE: Record<
  Extract<GoLiveRecipientResolution, { resolved: false }>["reason"],
  string
> = {
  policy_not_loaded: "Recipient Policy is still loading",
  single_configured_missing:
    "Single-configured mode is active but no address is set",
  no_active_named_recipient:
    "No active recipient in the Approved Named Recipients list",
  multiple_named_recipients_require_selection:
    "Multiple approved recipients — pick one for this test",
  no_specific_address_in_domain_mode:
    "Approved Domains mode cannot resolve a specific test recipient",
  policy_disabled: "Recipient Policy is DISABLED",
  controlled_external_mode_not_permitted:
    "Controlled External mode is not permitted for Go Live tests",
};

const REASON_EXPLANATION: Record<
  Extract<GoLiveRecipientResolution, { resolved: false }>["reason"],
  string
> = {
  policy_not_loaded:
    "The policy has not been fetched yet. Try again in a moment.",
  single_configured_missing:
    "Set the single configured address in Recipient Policy, then re-check.",
  no_active_named_recipient:
    "Add or activate at least one entry in the Approved Named Recipients list.",
  multiple_named_recipients_require_selection:
    "This mode lets the operator pick a specific approved address for each test send. Choose one below to continue.",
  no_specific_address_in_domain_mode:
    "Approved Domains mode allows a class of addresses but does not pin one for testing. Switch to Single or Named mode, or add a Named recipient temporarily.",
  policy_disabled:
    "Recipient Policy must be enabled before any test send can be authorised.",
  controlled_external_mode_not_permitted:
    "Controlled External mode is a production-only mode and cannot be used from the Go Live journey.",
};

interface Props {
  resolution: GoLiveRecipientResolution | null;
  loading: boolean;
  onSelectRecipient: (address: string) => void;
  onRecheck: () => void;
  selectedRecipient: string | null;
}

export default function RecipientResolutionPanel({
  resolution,
  loading,
  onSelectRecipient,
  onRecheck,
  selectedRecipient,
}: Props) {
  if (!resolution) {
    return (
      <div className="rounded-md border p-3 text-xs text-muted-foreground">
        Loading recipient policy…
      </div>
    );
  }

  if (resolution.resolved) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4" /> Test recipient resolved
        </div>
        <div className="mt-1 text-xs">
          Using{" "}
          <span className="font-mono">
            {maskEmailForDisplay(resolution.recipient)}
          </span>{" "}
          · source{" "}
          <Badge variant="outline" className="text-[10px]">
            {resolution.source}
          </Badge>
        </div>
        {resolution.source === "operator_selected_approved_recipient" &&
          resolution.candidates.length > 1 && (
            <div className="mt-3">
              <label className="text-xs font-medium">
                Change approved recipient
              </label>
              <div className="mt-1 max-w-sm">
                <Select
                  value={selectedRecipient ?? resolution.recipient}
                  onValueChange={onSelectRecipient}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick an approved recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {resolution.candidates.map((c) => (
                      <SelectItem key={c} value={c}>
                        {maskEmailForDisplay(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
      </div>
    );
  }

  const title = REASON_TITLE[resolution.reason];
  const explanation = REASON_EXPLANATION[resolution.reason];
  const showPicker =
    resolution.reason === "multiple_named_recipients_require_selection" &&
    resolution.candidates.length > 0;

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <div className="text-xs">{explanation}</div>
        <div className="mt-1 text-[11px] opacity-80">
          Blocker code:{" "}
          <code className="font-mono">{resolution.blockerCode}</code> · reason{" "}
          <code className="font-mono">{resolution.reason}</code>
        </div>

        {showPicker && (
          <div className="mt-3">
            <label className="text-xs font-medium">
              Approved recipients ({resolution.candidates.length})
            </label>
            <div className="mt-1 max-w-sm">
              <Select
                value={selectedRecipient ?? ""}
                onValueChange={onSelectRecipient}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick an approved recipient" />
                </SelectTrigger>
                <SelectContent>
                  {resolution.candidates.map((c) => (
                    <SelectItem key={c} value={c}>
                      {maskEmailForDisplay(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/admin/communication-hub/recipient-policy">
              <Wrench className="h-3.5 w-3.5 mr-1" /> Open Recipient Policy
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onRecheck}
            disabled={loading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`}
            />
            Re-check
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
