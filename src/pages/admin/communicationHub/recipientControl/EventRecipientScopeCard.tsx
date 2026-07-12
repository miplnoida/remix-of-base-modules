/**
 * EPIC CH-RECIPIENT-1 — EventRecipientScopeCard.
 *
 * Read-only, declarative card that shows per-event recipient scope so
 * operators can see who *would* be targeted for a given event and what
 * caps apply. No sending, no writes.
 */
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Users } from "lucide-react";

export interface EventRecipientScope {
  moduleCode: string;
  eventCode: string;
  recipient: string;              // e.g. "Assigned Legal Officer"
  recipientResolverType: string;  // e.g. "role_resolver"
  scope: "internal_only" | "internal_and_external";
  fallbackRecipient: string;
  maxRecipients: number;
  allowedInternalDomains: string[];
  allowedExternalDomains: string[];
  externalAllowed: boolean;
  bulkAllowed: boolean;
  cronAllowed: boolean;
  notes?: string;
}

export const LEGAL_INTERNAL_CASE_ASSIGNMENT_SCOPE: EventRecipientScope = {
  moduleCode: "LEGAL",
  eventCode: "INTERNAL_CASE_ASSIGNMENT_NOTICE",
  recipient: "Assigned Legal Officer",
  recipientResolverType: "role_resolver",
  scope: "internal_only",
  fallbackRecipient: "rohit@mishainfotech.com",
  maxRecipients: 1,
  allowedInternalDomains: ["mishainfotech.com"],
  allowedExternalDomains: [],
  externalAllowed: false,
  bulkAllowed: false,
  cronAllowed: false,
  notes: "Internal-only pilot event. External addresses are not permitted.",
};

function OnOff({ on, onLabel = "ON", offLabel = "OFF" }: { on: boolean; onLabel?: string; offLabel?: string }) {
  return <Badge variant={on ? "destructive" : "secondary"}>{on ? onLabel : offLabel}</Badge>;
}

export function EventRecipientScopeCard({ scope }: { scope: EventRecipientScope }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Event recipient scope
        </CardTitle>
        <CardDescription>
          <code className="text-xs">{scope.moduleCode} / {scope.eventCode}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm md:grid-cols-2">
        <Row label="Recipient" value={scope.recipient} />
        <Row label="Resolver type" value={<code className="text-xs">{scope.recipientResolverType}</code>} />
        <Row label="Scope" value={scope.scope === "internal_only" ? "Internal only" : "Internal + external"} />
        <Row label="Fallback recipient" value={<code className="text-xs">{scope.fallbackRecipient}</code>} />
        <Row label="Max recipients" value={<Badge variant="outline">{scope.maxRecipients}</Badge>} />
        <Row
          label="Allowed internal domains"
          value={
            scope.allowedInternalDomains.length === 0
              ? <span className="text-muted-foreground">none</span>
              : scope.allowedInternalDomains.map(d => (
                  <Badge key={d} variant="secondary" className="mr-1">{d}</Badge>
                ))
          }
        />
        <Row
          label="Allowed external domains"
          value={
            scope.allowedExternalDomains.length === 0
              ? <span className="text-muted-foreground">none</span>
              : scope.allowedExternalDomains.map(d => (
                  <Badge key={d} variant="destructive" className="mr-1">{d}</Badge>
                ))
          }
        />
        <Row label="External allowed" value={<OnOff on={scope.externalAllowed} />} />
        <Row label="Bulk allowed" value={<OnOff on={scope.bulkAllowed} />} />
        <Row label="Cron allowed" value={<OnOff on={scope.cronAllowed} />} />
        {scope.notes && (
          <div className="md:col-span-2 flex items-start gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 mt-0.5" /> {scope.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border rounded-md px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}
