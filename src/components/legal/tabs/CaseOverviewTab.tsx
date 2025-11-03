import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MockCase } from "@/data/mockLegalCases";
import { CalendarDays, Users, FileText, Clock, AlertCircle } from "lucide-react";

interface CaseOverviewTabProps {
  caseData: MockCase;
}

export function CaseOverviewTab({ caseData }: CaseOverviewTabProps) {
  const getSLAStatus = () => {
    if (caseData.age_days < 30) return { label: 'On Track', variant: 'default' as const, color: 'text-blue-600' };
    if (caseData.age_days < 60) return { label: 'At Risk', variant: 'warning' as const, color: 'text-orange-600' };
    return { label: 'Breached', variant: 'destructive' as const, color: 'text-red-600' };
  };

  const slaStatus = getSLAStatus();

  return (
    <div className="space-y-6">
      {/* Summary Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Case Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {caseData.summary}
            </p>
          </CardContent>
        </Card>

        {/* Key Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Key Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Filed On</div>
              <div className="text-sm font-medium">
                {new Date(caseData.filed_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Next Hearing</div>
              <div className="text-sm font-medium">
                {caseData.next_event_at
                  ? new Date(caseData.next_event_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Not scheduled'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Case Age</div>
              <div className="text-sm font-medium">{caseData.age_days} days</div>
            </div>
          </CardContent>
        </Card>

        {/* Parties */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {caseData.parties.map((party, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {idx === 0 ? 'Applicant' : 'Respondent'}
                  </Badge>
                  <span className="text-sm truncate">{party}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SLA Status */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              SLA Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={slaStatus.variant}>{slaStatus.label}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Days Open</span>
                <span className={`text-sm font-semibold ${slaStatus.color}`}>
                  {caseData.age_days}
                </span>
              </div>
              {slaStatus.label !== 'On Track' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    This case requires attention. Consider escalation or priority adjustment.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates and actions on this case</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {caseData.activities.map((activity, idx) => (
              <div key={idx} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{activity.action}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{activity.user}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
