import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Workflow, ShieldCheck, Bell, RotateCcw, Loader2 } from 'lucide-react';
import { useOnlineResponsePolicies } from '@/hooks/useOnlineResponse';

/**
 * Summary view of review-workflow routing per policy.
 * Per-policy editing happens in the Policy Matrix tab → editor dialog.
 */
export function OnlineResponseReviewWorkflowTab() {
  const { data: policies = [], isLoading } = useOnlineResponsePolicies();

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" />
            Review Routing Summary
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            How employer online submissions are routed for review per policy. Edit individual rules
            from the Policy Matrix tab. Reviews flow through the existing workflow engine.
          </p>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No policies configured yet.
            </div>
          ) : (
            <div className="space-y-2">
              {policies.map((p) => {
                const reviewers = [
                  p.requires_inspector_review && 'Inspector',
                  p.requires_lead_review && 'Lead',
                  p.requires_legal_review && 'Legal',
                ].filter(Boolean) as string[];
                return (
                  <div
                    key={p.id}
                    className="flex items-start justify-between gap-3 p-3 border rounded-md hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{p.policy_name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {reviewers.length === 0 ? (
                          <Badge variant="outline" className="text-[10px]">
                            Auto-accept (no review)
                          </Badge>
                        ) : (
                          reviewers.map((r) => (
                            <Badge key={r} variant="secondary" className="text-[10px]">
                              <ShieldCheck className="h-3 w-3 mr-1" /> {r} review
                            </Badge>
                          ))
                        )}
                        {p.reopens_case && (
                          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                            <RotateCcw className="h-3 w-3 mr-1" /> Re-opens case
                          </Badge>
                        )}
                        {p.triggers_notifications && (
                          <Badge variant="outline" className="text-[10px]">
                            <Bell className="h-3 w-3 mr-1" /> Notifications
                          </Badge>
                        )}
                      </div>
                      {p.workflow_id && (
                        <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                          workflow: {p.workflow_id}
                        </div>
                      )}
                    </div>
                    <Badge variant={p.is_active ? 'default' : 'outline'} className="text-[10px] shrink-0">
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
