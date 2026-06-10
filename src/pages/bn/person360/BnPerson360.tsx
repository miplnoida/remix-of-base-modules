/**
 * BN Person 360 — Main Page
 * 
 * Business Purpose:
 *   Provide a unified contributor/pensioner view across claims, benefits,
 *   entitlements, and benefit disbursements.
 * 
 * How it fits the existing system:
 *   - Profile: ip_master via personAdapter (read-only)
 *   - Claims: bn_claim + bn_product (future: cl_head)
 *   - Entitlements: bn_entitlement (new orchestration table)
 *   - Disbursements: cl_cheques (outbound benefit payments ONLY)
 *   - Payables: bn_payment_instruction (pre-issuance)
 *   - Employers: er_master via employerAdapter + ip_wages
 *   - Documents: bn_claim_evidence
 *   - Timeline: bn_claim_event (future: bn_audit_event)
 * 
 * NEVER reads cn_payment/cn_receipt for benefit payments.
 * 
 * Workflow integration:
 *   - Alerts panel shows escalations from bn_escalation_event
 *   - Claims link to workflow_instances via bn_claim.workflow_instance_id
 * 
 * Notification integration:
 *   - Pending info and overdue alerts integrate with notification_templates
 * 
 * Access: /bn/person-360?ssn=XXXXXX
 * Role visibility: All BN roles (read-only)
 */
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, ArrowLeft, FileText, Shield, Wallet, CreditCard, Building2, Paperclip, Clock, AlertTriangle } from 'lucide-react';

import { PersonProfileHeader } from '@/components/bn/person360/PersonProfileHeader';
import { PersonSummaryCards } from '@/components/bn/person360/PersonSummaryCards';
import { ClaimsTab } from '@/components/bn/person360/tabs/ClaimsTab';
import { EntitlementsTab } from '@/components/bn/person360/tabs/EntitlementsTab';
import { DisbursementsTab } from '@/components/bn/person360/tabs/DisbursementsTab';
import { PayablesTab } from '@/components/bn/person360/tabs/PayablesTab';
import { EmployersTab } from '@/components/bn/person360/tabs/EmployersTab';
import { DocumentsTab } from '@/components/bn/person360/tabs/DocumentsTab';
import { TimelineTab } from '@/components/bn/person360/tabs/TimelineTab';
import { WorkflowAlertsPanel } from '@/components/bn/person360/tabs/WorkflowAlertsPanel';

import {
  usePerson360Profile,
  usePerson360Claims,
  usePerson360Entitlements,
  usePerson360Disbursements,
  usePerson360Payables,
  usePerson360Employers,
  usePerson360Documents,
  usePerson360Timeline,
  usePerson360Summary,
} from '@/hooks/bn/useBnPerson360';

const BnPerson360: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const ssnParam = searchParams.get('ssn') || '';
  const [ssnInput, setSsnInput] = useState(ssnParam);
  const [activeSsn, setActiveSsn] = useState(ssnParam);

  const handleSearch = () => {
    const trimmed = ssnInput.trim();
    if (trimmed) {
      setActiveSsn(trimmed);
      setSearchParams({ ssn: trimmed });
    }
  };

  const { data: person, isLoading: profileLoading } = usePerson360Profile(activeSsn || undefined);
  const { data: summary, isLoading: summaryLoading } = usePerson360Summary(activeSsn || undefined);
  const { data: claims = [], isLoading: claimsLoading } = usePerson360Claims(activeSsn || undefined);
  const { data: entitlements = [], isLoading: entitlementsLoading } = usePerson360Entitlements(activeSsn || undefined);
  const { data: disbursements = [], isLoading: disbursementsLoading } = usePerson360Disbursements(activeSsn || undefined);
  const { data: payables = [], isLoading: payablesLoading } = usePerson360Payables(activeSsn || undefined);
  const { data: employers = [], isLoading: employersLoading } = usePerson360Employers(activeSsn || undefined);
  const { data: documents = [], isLoading: documentsLoading } = usePerson360Documents(activeSsn || undefined);
  const { data: timeline = [], isLoading: timelineLoading } = usePerson360Timeline(activeSsn || undefined);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/bn/claims')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="t-page-title">Person 360</h1>
          <p className="text-sm text-muted-foreground">Unified contributor/pensioner view</p>
        </div>
      </div>

      {/* SSN Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter SSN to search..."
                value={ssnInput}
                onChange={e => setSsnInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={!ssnInput.trim()}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* No person loaded state */}
      {!activeSsn && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Enter an SSN above to view the contributor profile</p>
          </CardContent>
        </Card>
      )}

      {/* Person not found */}
      {activeSsn && !profileLoading && !person && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="text-lg">No contributor found for SSN: <span className="font-mono font-bold">{activeSsn}</span></p>
          </CardContent>
        </Card>
      )}

      {/* Profile loaded */}
      {person && (
        <>
          {/* 1. Profile Header */}
          <PersonProfileHeader
            person={person}
            contributionWeeks={summary?.totalContributionWeeks}
          />

          {/* 10. Workflow Alerts */}
          <WorkflowAlertsPanel claims={claims} payables={payables} />

          {/* 2. Summary Cards */}
          {summary && <PersonSummaryCards summary={summary} />}

          {/* 3-9. Tabbed Content */}
          <Tabs defaultValue="claims" className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger value="claims" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Claims
                {claims.length > 0 && <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5">{claims.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="entitlements" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Entitlements
                {entitlements.length > 0 && <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5">{entitlements.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="payables" className="gap-1.5">
                <CreditCard className="h-3.5 w-3.5" /> Payables
                {payables.length > 0 && <span className="text-xs bg-amber-500/15 text-amber-700 rounded-full px-1.5">{payables.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="disbursements" className="gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Disbursements
                {disbursements.length > 0 && <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5">{disbursements.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="employers" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Employers
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> Documents
                {documents.length > 0 && <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5">{documents.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Timeline
              </TabsTrigger>
            </TabsList>

            <TabsContent value="claims">
              <Card className="p-5">
                <ClaimsTab claims={claims} isLoading={claimsLoading} />
              </Card>
            </TabsContent>

            <TabsContent value="entitlements">
              <Card className="p-5">
                <EntitlementsTab entitlements={entitlements} isLoading={entitlementsLoading} />
              </Card>
            </TabsContent>

            <TabsContent value="payables">
              <Card className="p-5">
                <PayablesTab payables={payables} isLoading={payablesLoading} />
              </Card>
            </TabsContent>

            <TabsContent value="disbursements">
              <Card className="p-5">
                <DisbursementsTab disbursements={disbursements} isLoading={disbursementsLoading} />
              </Card>
            </TabsContent>

            <TabsContent value="employers">
              <Card className="p-5">
                <EmployersTab employers={employers} isLoading={employersLoading} />
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card className="p-5">
                <DocumentsTab documents={documents} isLoading={documentsLoading} />
              </Card>
            </TabsContent>

            <TabsContent value="timeline">
              <Card className="p-5">
                <TimelineTab events={timeline} isLoading={timelineLoading} />
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default BnPerson360;
