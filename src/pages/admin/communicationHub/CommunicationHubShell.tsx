/**
 * Enterprise Communication Hub — simplified Overview.
 * Route: /admin/communication-hub
 *
 * CH-SIMPLE-P3G — Navigation Simplification.
 * The former large technical directory has been replaced with a concise
 * operational dashboard whose primary action is Go Live. All authoritative
 * state (mode, emergency stop, readiness) is server-derived; nothing is
 * cached in localStorage.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Rocket,
  ShieldCheck,
  Activity,
  FileText,
  Settings as SettingsIcon,
  FlaskConical,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { fetchGlobalSettings } from "@/platform/communication-hub/globalSettingsService";

function useOperatingMode() {
  return useQuery({
    queryKey: ["comm-hub", "global-settings", "overview"],
    queryFn: () => fetchGlobalSettings(),
    staleTime: 15_000,
  });
}

type SecondaryCard = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SECONDARY_CARDS: SecondaryCard[] = [
  {
    title: "Events & Templates",
    description: "Configure event → template mapping, template library and onboarding.",
    href: "/admin/communication-hub/design",
    icon: FileText,
  },
  {
    title: "Operations",
    description: "Monitor delivery, requests, dispatch register and lifecycle events.",
    href: "/admin/communication-hub/delivery-monitor",
    icon: Activity,
  },
  {
    title: "Settings",
    description: "Operating mode, emergency stop, recipient policy and sender profiles.",
    href: "/admin/communication-hub/control-center",
    icon: SettingsIcon,
  },
];

export default function CommunicationHubShell() {
  const { data: settings, isLoading } = useOperatingMode();

  const operatingMode = settings?.operatingMode ?? "unknown";
  const emergencyStopEngaged = Boolean(settings?.emergencyStopEngaged);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader
        title="Communication Hub"
        description="Prepare, test, and certify communication events. Go Live is the normal workflow."
      />

      {/* Emergency Stop banner */}
      {emergencyStopEngaged && (
        <Alert variant="destructive" data-testid="overview-emergency-stop">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Emergency Stop is engaged</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>All non-diagnostic sends are blocked. Resolve in Settings before continuing.</span>
            <Button asChild size="sm" variant="secondary">
              <Link to="/admin/communication-hub/control-center">Open Settings</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Operating mode strip */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Current operating mode</CardTitle>
            </div>
            <Badge variant={operatingMode === "off" ? "destructive" : "secondary"} data-testid="overview-operating-mode">
              {isLoading ? "loading…" : operatingMode}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Primary CTA — Go Live */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <CardTitle>Go Live</CardTitle>
          </div>
          <CardDescription>
            The normal path to prepare, preview, dry-test, and controlled-live-test a
            communication event. Readiness is loaded from authoritative server settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg" data-testid="overview-go-live-cta">
            <Link to="/admin/communication-hub/go-live" aria-label="Open Go Live">
              Open Go Live
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Secondary shortcuts */}
      <div className="grid gap-4 md:grid-cols-3" data-testid="overview-secondary-cards">
        {SECONDARY_CARDS.map(({ title, description, href, icon: Icon }) => (
          <Link key={href} to={href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">{title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {description}
                <div className="mt-3 flex items-center gap-1 text-xs text-primary">
                  Open <ChevronRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Advanced Diagnostics — de-emphasised */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm text-muted-foreground">Advanced Diagnostics</CardTitle>
          </div>
          <CardDescription>
            Technical workspaces for authorised investigation. Not part of the normal
            operator process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="ghost" size="sm" data-testid="overview-advanced-diagnostics">
            <Link to="/admin/communication-hub/pilots">
              Open Advanced Diagnostics
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
