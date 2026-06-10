import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { BN_CLAIM_STATUS_LABELS } from '@/types/bn';
import type { BnClaimTransitionRule } from '@/types/bn';
import { BnScreenRoleBanner } from '@/components/bn/shared';
import { isAllowedTransition } from '@/services/bn/registries';

const db = supabase as any;

export default function TransitionMatrix() {
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['bn', 'transition-rules-admin'],
    queryFn: async () => {
      const { data, error } = await db
        .from('bn_claim_transition_rule')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as BnClaimTransitionRule[];
    },
  });

  const groupedByAction = rules.reduce<Record<string, BnClaimTransitionRule[]>>((acc, rule) => {
    if (!acc[rule.action_code]) acc[rule.action_code] = [];
    acc[rule.action_code].push(rule);
    return acc;
  }, {});

  const invalidRules = rules.filter(r =>
    r.is_active && !isAllowedTransition(r.from_status, r.action_code, r.to_status)
  );

  const renderPreconditions = (rule: BnClaimTransitionRule) => {
    const conds: string[] = [];
    if (rule.requires_reason) conds.push('Reason');
    if (rule.requires_narrative) conds.push('Narrative');
    if (rule.requires_maker_checker) conds.push('Maker-Checker');
    if (rule.requires_evidence_complete) conds.push('Evidence');
    if (rule.requires_eligibility_pass) conds.push('Eligibility');
    if (rule.requires_calculation) conds.push('Calculation');
    return conds;
  };

  return (
    <PermissionWrapper moduleName="benefits_management">
      <div className="space-y-6 p-6">
        <h1 className="t-page-title">Transition Matrix</h1>
        <p className="text-sm text-muted-foreground">
          Configuration-driven rules that govern all claim status transitions.
        </p>

        <BnScreenRoleBanner
          role="library"
          productAssemblyHint
          description="Reusable fallback status/action matrix. Product Catalog and workflow templates reference this matrix when the central workflow is missing or disabled."
        />


        {!isLoading && (
          invalidRules.length > 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{invalidRules.length} active rule(s) violate the transition registry</AlertTitle>
              <AlertDescription>
                The following (from → action → to) tuples are not in the allowed registry and may produce broken claim flows:
                <ul className="mt-2 list-disc pl-5 text-xs">
                  {invalidRules.slice(0, 10).map(r => (
                    <li key={r.id}>
                      <code>{r.from_status}</code> — <code>{r.action_code}</code> → <code>{r.to_status}</code>
                    </li>
                  ))}
                  {invalidRules.length > 10 && <li>… and {invalidRules.length - 10} more</li>}
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>All active rules conform to the transition registry</AlertTitle>
            </Alert>
          )
        )}

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          Object.entries(groupedByAction).map(([action, actionRules]) => (
            <Card key={action}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{action} ({actionRules.length} rules)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead></TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Preconditions</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actionRules.map(rule => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {(BN_CLAIM_STATUS_LABELS as any)[rule.from_status] || rule.from_status}
                          </Badge>
                        </TableCell>
                        <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {(BN_CLAIM_STATUS_LABELS as any)[rule.to_status] || rule.to_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{rule.action_label}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {rule.allowed_roles.map(r => (
                              <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {renderPreconditions(rule).map(c => (
                              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                            ))}
                            {renderPreconditions(rule).length === 0 && (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.is_active ? 'default' : 'outline'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PermissionWrapper>
  );
}
