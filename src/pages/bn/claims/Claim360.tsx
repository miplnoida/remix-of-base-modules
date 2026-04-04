import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, FileText, Calculator, CheckCircle2, Clock, MessageSquare, Shield } from 'lucide-react';
import { useBnClaim, useBnClaimEvents, useBnClaimNotes, useBnClaimEligibility, useBnClaimCalculations, useBnClaimDocuments } from '@/hooks/bn/useBnClaim';
import { BN_CLAIM_STATUS_LABELS } from '@/types/bn';
import { formatDateForDisplay } from '@/lib/format-config';
import { ClaimDecisionPanel } from '@/components/bn/claim/ClaimDecisionPanel';
import { ClaimDecisionTimeline } from '@/components/bn/claim/ClaimDecisionTimeline';

export default function Claim360() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: claim, isLoading } = useBnClaim(id);
  const { data: events = [] } = useBnClaimEvents(id);
  const { data: notes = [] } = useBnClaimNotes(id);
  const { data: eligibility = [] } = useBnClaimEligibility(id);
  const { data: calculations = [] } = useBnClaimCalculations(id);
  const { data: documents = [] } = useBnClaimDocuments(id);

  // TODO: Replace with actual user roles from auth context
  const userRoles = ['Admin'];

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading claim...</p></div>;
  }

  if (!claim) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Claim not found</p></div>;
  }

  const product = (claim as any).bn_product;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/bn/claims')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-foreground">
                Claim {claim.claim_number || claim.id.slice(0, 8)}
              </h1>
              <Badge variant="default">
                {BN_CLAIM_STATUS_LABELS[claim.status] || claim.status}
              </Badge>
              <Badge variant={claim.priority === 'URGENT' || claim.priority === 'HIGH' ? 'destructive' : 'outline'}>
                {claim.priority}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {product?.benefit_name || 'Unknown Benefit'} • SSN: {claim.ssn} • Filed: {formatDateForDisplay(claim.claim_date)}
            </p>
          </div>
        </div>
      </div>

      {/* Decision Panel */}
      <ClaimDecisionPanel
        claimId={claim.id}
        userRoles={userRoles}
        productCategory={product?.category}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <User className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Insured Person</p>
              <p className="text-lg font-semibold">{claim.ssn}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Documents</p>
              <p className="text-lg font-semibold">{documents.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Eligibility</p>
              <p className="text-lg font-semibold">
                {eligibility.length > 0 ? (eligibility[0].overall_result ? 'Passed' : 'Failed') : 'Pending'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calculator className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Calculated Rate</p>
              <p className="text-lg font-semibold">
                {calculations.length > 0 ? `$${calculations[0].weekly_rate?.toFixed(2) || '0.00'}/wk` : 'Pending'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Tabs */}
      <Tabs defaultValue="decisions" className="w-full">
        <TabsList>
          <TabsTrigger value="decisions" className="gap-2"><Shield className="h-4 w-4" /> Decisions</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2"><Clock className="h-4 w-4" /> Timeline</TabsTrigger>
          <TabsTrigger value="eligibility" className="gap-2"><CheckCircle2 className="h-4 w-4" /> Eligibility</TabsTrigger>
          <TabsTrigger value="calculation" className="gap-2"><Calculator className="h-4 w-4" /> Calculation</TabsTrigger>
          <TabsTrigger value="documents" className="gap-2"><FileText className="h-4 w-4" /> Documents</TabsTrigger>
          <TabsTrigger value="notes" className="gap-2"><MessageSquare className="h-4 w-4" /> Notes</TabsTrigger>
        </TabsList>

        {/* Decisions */}
        <TabsContent value="decisions" className="mt-6">
          <ClaimDecisionTimeline claimId={claim.id} />
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Claim Timeline</CardTitle></CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-muted-foreground">No events recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="flex gap-4 border-l-2 border-primary/30 pl-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{event.event_type}</span>
                          {event.from_status && event.to_status && (
                            <span className="text-sm text-muted-foreground">
                              {event.from_status} → {event.to_status}
                            </span>
                          )}
                        </div>
                        {event.notes && <p className="mt-1 text-sm text-muted-foreground">{event.notes}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">
                          by {event.performed_by} • {formatDateForDisplay(event.performed_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Eligibility */}
        <TabsContent value="eligibility" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Eligibility Check Results</CardTitle></CardHeader>
            <CardContent>
              {eligibility.length === 0 ? (
                <p className="text-muted-foreground">No eligibility checks performed yet.</p>
              ) : (
                <div className="space-y-4">
                  {eligibility.map((check) => (
                    <div key={check.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <Badge variant={check.overall_result ? 'default' : 'destructive'}>
                          {check.overall_result ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{formatDateForDisplay(check.check_date)}</span>
                      </div>
                      {check.override_applied && (
                        <p className="mt-2 text-sm text-destructive">
                          Override by {check.override_by}: {check.override_reason}
                        </p>
                      )}
                      {Array.isArray(check.rule_results) && check.rule_results.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {check.rule_results.map((r: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className={r.passed ? 'text-primary' : 'text-destructive'}>{r.passed ? '✓' : '✗'}</span>
                              <span>{r.rule_name}: {r.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calculation */}
        <TabsContent value="calculation" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Calculation Results</CardTitle></CardHeader>
            <CardContent>
              {calculations.length === 0 ? (
                <p className="text-muted-foreground">No calculations performed yet.</p>
              ) : (
                <div className="space-y-4">
                  {calculations.map((calc) => (
                    <div key={calc.id} className="rounded-lg border p-4">
                      <div className="grid grid-cols-3 gap-4">
                        {calc.weekly_rate != null && (
                          <div><p className="text-sm text-muted-foreground">Weekly Rate</p><p className="text-xl font-semibold">${calc.weekly_rate.toFixed(2)}</p></div>
                        )}
                        {calc.monthly_rate != null && (
                          <div><p className="text-sm text-muted-foreground">Monthly Rate</p><p className="text-xl font-semibold">${calc.monthly_rate.toFixed(2)}</p></div>
                        )}
                        {calc.lump_sum != null && (
                          <div><p className="text-sm text-muted-foreground">Lump Sum</p><p className="text-xl font-semibold">${calc.lump_sum.toFixed(2)}</p></div>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Calculated: {formatDateForDisplay(calc.calc_date)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Claim Documents ({documents.length})</CardTitle></CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-muted-foreground">No documents attached.</p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{doc.document_name || doc.file_name}</p>
                        <p className="text-sm text-muted-foreground">{doc.document_type_code}</p>
                      </div>
                      <Badge variant={doc.verified ? 'default' : 'outline'}>
                        {doc.verified ? 'Verified' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Officer Notes ({notes.length})</CardTitle></CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <p className="text-muted-foreground">No notes added.</p>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-lg border p-4">
                      {note.subject && <p className="font-medium">{note.subject}</p>}
                      <p className="mt-1 text-sm">{note.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        by {note.entered_by} • {formatDateForDisplay(note.entered_at)} • {note.is_internal ? 'Internal' : 'External'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
