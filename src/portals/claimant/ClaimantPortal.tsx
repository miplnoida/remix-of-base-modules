import { Routes, Route, Navigate, useParams, Link } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { ExternalPortalShell, type NavItem } from '@/portals/_shared/ExternalPortalShell';
import { NotificationBell } from '@/portals/_shared/NotificationBell';
import { HelpButton } from '@/portals/_shared/HelpButton';
import { ExternalTaskList } from '@/portals/_shared/ExternalTaskList';
import { ExternalTaskForm } from '@/portals/_shared/ExternalTaskForm';

import { PortalFormRenderer } from '@/components/external/PortalFormRenderer';
import { RequirePersonaFlag } from '@/components/external/RequirePersonaFlag';
import ClaimantLanding from '@/portals/claimant/ClaimantLanding';
import LinkSsnPage from '@/portals/claimant/LinkSsnPage';
import AccountProfilePage from '@/portals/claimant/account/AccountProfilePage';
import RelationshipsPage from '@/portals/claimant/account/RelationshipsPage';
import ContributionStatementsPage from '@/portals/claimant/account/ContributionStatementsPage';
import BankUpdatePage from '@/portals/claimant/account/BankUpdatePage';
import ManagedPeoplePage from '@/portals/claimant/managed/ManagedPeoplePage';
import ManagedPersonDetailPage from '@/portals/claimant/managed/ManagedPersonDetailPage';
import ClaimsPage from '@/portals/claimant/benefits/ClaimsPage';
import EntitlementsPage from '@/portals/claimant/benefits/EntitlementsPage';
import PaymentsPage from '@/portals/claimant/benefits/PaymentsPage';
import EligibilityEstimatorPage from '@/portals/claimant/benefits/EligibilityEstimatorPage';
import LifeCertificatePage from '@/portals/claimant/compliance/LifeCertificatePage';
import LettersPage from '@/portals/claimant/comms/LettersPage';
import NotificationsPage from '@/portals/claimant/comms/NotificationsPage';
import HelpCenterPage from '@/portals/claimant/help/HelpCenterPage';
import FaqsPage from '@/portals/claimant/help/FaqsPage';
import ContactSsbPage from '@/portals/claimant/help/ContactSsbPage';
import OfficeLocationsPage from '@/portals/claimant/help/OfficeLocationsPage';
import TechnicalSupportPage from '@/portals/claimant/help/TechnicalSupportPage';
import MorePage from '@/portals/claimant/MorePage';
import DocumentCenterPage from '@/portals/claimant/documents/DocumentCenterPage';
import SelfServiceDashboard from '@/portals/claimant/dashboard/SelfServiceDashboard';
import AppealsPage from '@/portals/claimant/appeals/AppealsPage';
import ApplyWizard from '@/portals/claimant/apply/ApplyWizard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useExternalClaimStatus, useExternalMessages,
  useExternalClaims, useExternalClaimBuckets, useExternalAwards, useExternalPayments, useExternalContributions,
  useExternalEmploymentHistory, useExternalProfile,
} from '@/portals/_shared/externalHooks';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { useProductApplicability, type ApplicableProduct } from '@/hooks/external/useProductApplicability';
import { usePortalFeatureConfig } from '@/hooks/external/usePortalFeatureConfig';
import { RequireFeature } from '@/components/external/RequireFeature';
import type { PersonaFlags, Persona } from '@/services/external/portalPersonaService';
import type { PortalFeatureConfig } from '@/services/external/portalFeatureConfigService';

import {
  Home as HomeIcon, FileText, Search, Wallet, ListChecks, FolderOpen, PiggyBank,
  Users, MoreHorizontal, User, Phone, Bell, Lock, IdCard, CheckCircle2,
} from 'lucide-react';

const BRAND = 'Social Security Self-Service Portal';

/** Mobile bottom nav (5 slots). */
const MOBILE_NAV_ITEMS: NavItem[] = [
  { to: '/claimant/dashboard', label: 'Home', icon: HomeIcon },
  { to: '/claimant/apply', label: 'Apply', icon: FileText },
  { to: '/claimant/claims', label: 'Claims', icon: Search },
  { to: '/claimant/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/claimant/more', label: 'More', icon: MoreHorizontal },
];

/**
 * Build a flat, public-friendly sidebar (max 8 items).
 * Profile/Notifications/Help/Compliance/Appeals/Bank/Letters/Certificates do NOT appear here —
 * they live in the avatar menu, header bell, header help button, or under Tasks/Documents/Benefits.
 */
function buildSidebar(
  flags: PersonaFlags | undefined,
  personas: Persona[],
  features: PortalFeatureConfig | undefined,
): NavItem[] {
  const f = flags ?? ({} as PersonaFlags);
  const ft: PortalFeatureConfig = features ?? ({
    peopleIMangeEnabled: true,
    guardianPayeeEnabled: true,
    representativeAccessEnabled: true,
    contributionHistoryEnabled: true,
    paymentHistoryEnabled: true,
  } as PortalFeatureConfig);

  const isInsured = personas.includes('INSURED_PERSON');
  const isPensioner = personas.includes('PENSIONER');
  const isBeneficiary = personas.includes('BENEFICIARY');
  const isGuardianOrPayee = personas.includes('GUARDIAN') || personas.includes('PAYEE');
  const isRepresentative = personas.includes('REPRESENTATIVE');

  const selfVerified = !!f.canViewContributions;
  const hasBenefitActivity = !!f.canViewPayments || isPensioner || isBeneficiary;
  const managerEnabled =
    ft.peopleIMangeEnabled &&
    ((isGuardianOrPayee && ft.guardianPayeeEnabled) ||
      (isRepresentative && ft.representativeAccessEnabled));

  const items: NavItem[] = [
    { to: '/claimant/dashboard', label: 'Home', icon: HomeIcon },
    { to: '/claimant/apply', label: 'Apply', icon: FileText },
    { to: '/claimant/claims', label: 'Claims', icon: Search },
  ];
  if (hasBenefitActivity) {
    items.push({ to: '/claimant/entitlements', label: 'Benefits & Payments', icon: Wallet });
  }
  items.push({ to: '/claimant/tasks', label: 'Tasks', icon: ListChecks });
  items.push({ to: '/claimant/documents', label: 'Documents', icon: FolderOpen });
  if (isInsured && selfVerified && ft.contributionHistoryEnabled) {
    items.push({ to: '/claimant/contributions', label: 'My Social Security', icon: PiggyBank });
  }
  if (managerEnabled) {
    items.push({ to: '/claimant/managed/people', label: 'People I Manage', icon: Users });
  }
  return items;
}


function maskSsn(ssn: string | null | undefined): string {
  if (!ssn) return '—';
  if (ssn.length <= 3) return ssn;
  return `${'•'.repeat(Math.max(0, ssn.length - 3))}${ssn.slice(-3)}`;
}

function PersonaHeader() {
  const { persona, isLoading } = useClaimantPersona();
  if (import.meta.env.DEV) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => { console.debug('[shell] persona', { isLoading, persona }); }, [isLoading, persona]);
  }
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-primary-foreground/80 text-sm">
        <span className="inline-block h-3 w-32 animate-pulse rounded bg-white/20" />
      </div>
    );
  }
  if (!persona) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-primary-foreground/95 text-sm">
        <span>Welcome</span>
        <Button asChild size="sm" variant="secondary" className="h-7">
          <Link to="/claimant/link-ssn">Link my SSN</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-primary-foreground/95">
      <span className="text-sm font-medium">{persona.displayName}</span>
      {persona.personSsn && (
        <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-mono">
          SSN {maskSsn(persona.personSsn)}
        </span>
      )}
      <span className="opacity-70">·</span>
      {persona.personas.length === 0 ? (
        <Badge variant="outline" className="border-white/40 bg-white/10 text-xs text-primary-foreground">
          PERSONA NOT VERIFIED
        </Badge>
      ) : (
        persona.personas.map(p => (
          <Badge key={p} variant="outline" className="border-white/40 bg-white/10 text-xs text-primary-foreground">
            {p.replace(/_/g, ' ')}
          </Badge>
        ))
      )}
      {!persona.personSsn && (
        <Button asChild size="sm" variant="secondary" className="ml-2 h-7">
          <Link to="/claimant/link-ssn">Link my SSN</Link>
        </Button>
      )}
    </div>
  );
}

/** Compact status block shown at the top of the user dropdown. */
function UserMenuStatus() {
  const { persona } = useClaimantPersona();
  if (!persona) return null;
  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">SSN:</span>
        {persona.personSsn ? (
          <Badge variant="secondary" className="font-mono">
            <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
            {maskSsn(persona.personSsn)}
          </Badge>
        ) : (
          <Link to="/claimant/link-ssn" className="text-primary hover:underline">Not linked — link now</Link>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Email:</span>
        <Badge variant="secondary" className="text-[10px]">
          <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Verified
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-muted-foreground mr-0.5">Roles:</span>
        {persona.personas.length === 0 ? (
          <Badge variant="outline" className="text-[10px]">Not verified</Badge>
        ) : (
          persona.personas.map(p => (
            <Badge key={p} variant="outline" className="text-[10px]">
              {p.replace(/_/g, ' ')}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}





export default function ClaimantPortal() {
  const { persona } = useClaimantPersona();
  const { data: features } = usePortalFeatureConfig();
  const sidebarItems = useMemo(
    () => buildSidebar(persona?.flags, persona?.personas ?? [], features),
    [persona, features],
  );
  return (
    <Routes>
      <Route index element={<ClaimantLanding />} />
      <Route path="*" element={
        <ExternalPortalShell
          role="CLAIMANT"
          brand={BRAND}
          nav={sidebarItems}
          subHeader={<PersonaHeader />}
          homeHref="/claimant/dashboard"
          notificationBell={<NotificationBell viewAllHref="/claimant/notifications" />}
          helpButton={<HelpButton helpHref="/claimant/help" />}
          userMenuItems={[
            { to: '/claimant/account', label: 'My Profile', icon: User },
            { to: '/claimant/account/contacts', label: 'Contact Information', icon: Phone },
            { to: '/claimant/account/preferences', label: 'Communication Preferences', icon: Bell },
            { to: '/claimant/account/security', label: 'Security Settings', icon: Lock },
            { to: '/claimant/account/identity', label: 'Linked SSN / Identity', icon: IdCard },
            { to: '/claimant/account/relationships', label: 'Relationships', icon: Users },
          ]}
          userMenuHeader={<UserMenuStatus />}
          mobileNavItems={MOBILE_NAV_ITEMS}
        >
          <Routes>
            <Route path="dashboard" element={<SelfServiceDashboard />} />
            <Route path="link-ssn" element={<LinkSsnPage />} />

            {/* MY ACCOUNT — now under /account, old /profile paths redirect */}
            <Route path="account" element={<AccountProfilePage />} />
            <Route path="account/contacts" element={<AccountProfilePage initialTab="contacts" />} />
            <Route path="account/preferences" element={<AccountProfilePage initialTab="preferences" />} />
            <Route path="account/security" element={<AccountProfilePage initialTab="security" />} />
            <Route path="account/identity" element={<AccountProfilePage initialTab="security" />} />
            <Route path="account/relationships" element={<RelationshipsPage />} />
            <Route path="profile" element={<Navigate to="/claimant/account" replace />} />
            <Route path="profile/contacts" element={<Navigate to="/claimant/account/contacts" replace />} />
            <Route path="profile/preferences" element={<Navigate to="/claimant/account/preferences" replace />} />
            <Route path="profile/security" element={<Navigate to="/claimant/account/security" replace />} />
            <Route path="relationships" element={<Navigate to="/claimant/account/relationships" replace />} />


            {/* MY SOCIAL SECURITY (insured only) */}
            <Route path="contributions" element={
              <RequireFeature feature="contributionHistoryEnabled" title="Contribution History unavailable">
                <RequirePersonaFlag flag="canViewContributions" title="Contribution history is private">
                  <Contributions />
                </RequirePersonaFlag>
              </RequireFeature>
            } />
            <Route path="employment-history" element={
              <RequireFeature feature="employmentHistoryEnabled" title="Employment History unavailable">
                <RequirePersonaFlag flag="canViewEmploymentHistory" title="Employment history is private">
                  <Employment />
                </RequirePersonaFlag>
              </RequireFeature>
            } />
            <Route path="statements" element={
              <RequireFeature feature="contributionHistoryEnabled" title="Statements unavailable">
                <RequirePersonaFlag flag="canViewContributions" title="Contribution statements are private">
                  <ContributionStatementsPage />
                </RequirePersonaFlag>
              </RequireFeature>
            } />
            <Route path="insurable-earnings" element={
              <RequireFeature feature="contributionHistoryEnabled" title="Insurable Earnings unavailable">
                <RequirePersonaFlag flag="canViewContributions" title="Insurable earnings are private">
                  <ContributionStatementsPage />
                </RequirePersonaFlag>
              </RequireFeature>
            } />

            {/* BENEFITS */}
            <Route path="apply" element={<ApplyWizard />} />
            <Route path="apply/:productCode" element={<ApplyForm />} />
            <Route path="estimator" element={
              <RequireFeature feature="eligibilityEstimatorEnabled" title="Eligibility Estimator unavailable">
                <EligibilityEstimatorPage />
              </RequireFeature>
            } />
            <Route path="claims" element={<ClaimsPage />} />
            <Route path="claims/:claimNumber" element={<ClaimDetail />} />
            <Route path="entitlements" element={<EntitlementsPage />} />
            <Route path="payments" element={
              <RequireFeature feature="paymentHistoryEnabled" title="Payment History unavailable">
                <RequirePersonaFlag flag="canViewPayments" title="No payments visible to this account">
                  <PaymentsPage />
                </RequirePersonaFlag>
              </RequireFeature>
            } />

            {/* PEOPLE I MANAGE */}
            <Route path="managed/people" element={
              <RequireFeature feature="peopleIMangeEnabled" title="People I Manage is disabled">
                <ManagedPeoplePage />
              </RequireFeature>
            } />
            <Route path="managed/people/:ssn" element={
              <RequireFeature feature="peopleIMangeEnabled" title="People I Manage is disabled">
                <ManagedPersonDetailPage />
              </RequireFeature>
            } />
            <Route path="managed/claims" element={
              <RequireFeature feature="peopleIMangeEnabled" title="Managed Claims is disabled">
                <ManagedPeoplePage />
              </RequireFeature>
            } />
            <Route path="managed/benefits" element={
              <RequireFeature feature="peopleIMangeEnabled" title="Managed Benefits is disabled">
                <ManagedPeoplePage />
              </RequireFeature>
            } />

            {/* COMPLIANCE */}
            <Route path="compliance/life" element={
              <RequireFeature feature="lifeCertificateEnabled" title="Life Certificates unavailable">
                <LifeCertificatePage />
              </RequireFeature>
            } />
            <Route path="compliance/school" element={
              <RequireFeature feature="schoolCertificateEnabled" title="School Certificates unavailable">
                <LifeCertificatePage />
              </RequireFeature>
            } />
            <Route path="compliance/verification" element={<ExternalTaskList basePath="/claimant/tasks" />} />
            <Route path="compliance/outstanding" element={<ExternalTaskList basePath="/claimant/tasks" />} />

            {/* COMMUNICATIONS / NOTIFICATIONS */}
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="comms/inbox" element={<Messages />} />
            <Route path="comms/letters" element={<LettersPage />} />
            <Route path="comms/notifications" element={<Navigate to="/claimant/notifications" replace />} />

            {/* HELP & MORE */}
            <Route path="help" element={<HelpCenterPage />} />
            <Route path="help/faqs" element={<FaqsPage />} />
            <Route path="help/contact" element={<ContactSsbPage />} />
            <Route path="help/offices" element={<OfficeLocationsPage />} />
            <Route path="help/technical" element={<TechnicalSupportPage />} />
            <Route path="help/*" element={<HelpCenterPage />} />
            <Route path="more" element={<MorePage />} />

            <Route path="tasks" element={<ExternalTaskList basePath="/claimant/tasks" />} />
            <Route path="tasks/:taskId" element={<TaskDetail />} />

            {/* DOCUMENTS */}
            <Route path="documents" element={<DocumentCenterPage />} />

            {/* APPEALS */}
            <Route path="appeals" element={
              <RequireFeature feature="appealsEnabled" title="Appeals unavailable">
                <AppealsPage />
              </RequireFeature>
            } />
            <Route path="appeals/reconsideration" element={
              <RequireFeature feature="appealsEnabled" title="Reconsiderations unavailable">
                <AppealsPage />
              </RequireFeature>
            } />

            {/* Legacy / fallback */}
            <Route path="bank-details" element={
              <RequireFeature feature="bankUpdateEnabled" title="Bank Update unavailable">
                <BankUpdatePage />
              </RequireFeature>
            } />
            <Route path="awards" element={<Navigate to="/claimant/entitlements" replace />} />
            <Route path="messages" element={<Navigate to="/claimant/comms/inbox" replace />} />
            <Route path="life-certificates" element={<Navigate to="/claimant/compliance/life" replace />} />
            <Route path="school-certificates" element={<Navigate to="/claimant/compliance/school" replace />} />
            <Route path="*" element={<Navigate to="/claimant/dashboard" replace />} />
          </Routes>
        </ExternalPortalShell>
      } />
    </Routes>
  );
}

/* ─── Dashboard (6 sections) ───────────────────────────────────────── */

function Dashboard() {
  const { persona } = useClaimantPersona();
  const { data: features } = usePortalFeatureConfig();
  const f = persona?.flags;
  const showPayments = !!f?.canViewPayments && features?.paymentHistoryEnabled !== false;
  const showSocialSecurity = !!f?.canViewContributions && features?.contributionHistoryEnabled !== false;
  return (
    <div className="space-y-6">
      <SectionClaimActivity />
      <SectionBenefits />
      {showPayments && <SectionPayments />}
      <SectionCompliance />
      <SectionCommunications />
      {showSocialSecurity && <SectionSocialSecuritySummary />}
    </div>
  );
}

function DashSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function CountCard({ to, title, value, hint }: { to: string; title: string; value: React.ReactNode; hint?: string }) {
  return (
    <Link to={to}>
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <CardDescription className="text-2xl font-bold text-foreground">{value}</CardDescription>
          {hint && <CardDescription className="text-xs">{hint}</CardDescription>}
        </CardHeader>
      </Card>
    </Link>
  );
}

function SectionClaimActivity() {
  const { data, isLoading } = useExternalClaimBuckets();
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  const b = data ?? { own: [], submittedForOthers: [], asBeneficiary: [], asGuardianOrPayee: [] };
  return (
    <DashSection title="Claim Activity" description="All claims connected to you, grouped by your role.">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <CountCard to="/claimant/claims?tab=own" title="My Own Claims" value={b.own.length} />
        <CountCard to="/claimant/claims?tab=submitted" title="Claims Submitted By Me" value={b.submittedForOthers.length} />
        <CountCard to="/claimant/claims?tab=beneficiary" title="Claims As Beneficiary" value={b.asBeneficiary.length} />
        <CountCard to="/claimant/claims?tab=guardian" title="Claims As Guardian" value={b.asGuardianOrPayee.length} />
      </div>
    </DashSection>
  );
}

function SectionBenefits() {
  const { data, isLoading } = useExternalAwards();
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  const rows = (data?.awards ?? []) as any[];
  const norm = (s?: string) => String(s ?? '').toUpperCase();
  const active = rows.filter(r => ['ACTIVE', 'IN_PAYMENT', 'AWARDED'].includes(norm(r.status)));
  const pending = rows.filter(r => ['PENDING', 'AWAITING_APPROVAL', 'DRAFT'].includes(norm(r.status)));
  const suspended = rows.filter(r => ['SUSPENDED', 'ON_HOLD'].includes(norm(r.status)));
  return (
    <DashSection title="Benefits">
      <div className="grid gap-3 md:grid-cols-3">
        <CountCard to="/claimant/entitlements?tab=active" title="Active Benefits" value={active.length} />
        <CountCard to="/claimant/entitlements?tab=pending" title="Pending Benefits" value={pending.length} />
        <CountCard to="/claimant/entitlements?tab=suspended" title="Suspended Benefits" value={suspended.length} />
      </div>
    </DashSection>
  );
}

function SectionPayments() {
  const { data, isLoading } = useExternalPayments();
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  const rows = (data?.payments ?? []) as any[];
  const norm = (s?: string) => String(s ?? '').toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.filter(r => r.payment_date && r.payment_date >= today);
  const recent = rows.filter(r => r.payment_date && r.payment_date < today).slice(0, 50);
  const returned = rows.filter(r => ['RETURNED', 'FAILED', 'REJECTED'].includes(norm(r.status)));
  return (
    <DashSection title="Payments">
      <div className="grid gap-3 md:grid-cols-3">
        <CountCard to="/claimant/payments?tab=upcoming" title="Upcoming Payments" value={upcoming.length} />
        <CountCard to="/claimant/payments?tab=history" title="Recent Payments" value={recent.length} />
        <CountCard to="/claimant/payments?tab=returned" title="Returned Payments" value={returned.length} />
      </div>
    </DashSection>
  );
}

function SectionCompliance() {
  return (
    <DashSection title="Compliance" description="Items requiring your attention to keep benefits active.">
      <div className="grid gap-3 md:grid-cols-3">
        <CountCard to="/claimant/compliance/life" title="Life Certificate Due" value="—" hint="Annual proof-of-life" />
        <CountCard to="/claimant/compliance/school" title="School Certificate Due" value="—" hint="Enrolment proofs" />
        <CountCard to="/claimant/compliance/outstanding" title="Outstanding Documents" value="—" hint="Open evidence requests" />
      </div>
    </DashSection>
  );
}

function SectionCommunications() {
  const { data, isLoading } = useExternalMessages();
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  const msgs = (data?.messages ?? []) as any[];
  return (
    <DashSection title="Communications">
      <div className="grid gap-3 md:grid-cols-3">
        <CountCard to="/claimant/comms/inbox" title="Unread Messages" value={msgs.length} />
        <CountCard to="/claimant/comms/letters" title="Letters" value="—" />
        <CountCard to="/claimant/tasks" title="Pending Tasks" value="—" />
      </div>
    </DashSection>
  );
}

function SectionSocialSecuritySummary() {
  const { data, isLoading } = useExternalContributions();
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  const rows = (data?.contributions ?? []) as any[];
  const years = rows.length;
  const totalContrib = rows.reduce((s, r) => s + Number(r.contributions_paid ?? 0), 0);
  const lastYear = rows[0]?.year_paid ?? '—';
  return (
    <DashSection title="Social Security Summary" description="Visible only because your SSN is linked as the insured person.">
      <div className="grid gap-3 md:grid-cols-4">
        <CountCard to="/claimant/contributions" title="Contribution Years" value={years} />
        <CountCard to="/claimant/contributions" title="Total Contributions" value={totalContrib.toFixed(2)} />
        <CountCard to="/claimant/employment-history" title="Last Employer" value="—" />
        <CountCard to="/claimant/statements" title="Last Year on Record" value={String(lastYear)} />
      </div>
    </DashSection>
  );
}

/* ─── Profile / Contributions / Employment / Apply / Claims / Entitlements / Payments / Messages ── */

function Profile() {
  const { data, isLoading } = useExternalProfile();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const p = data?.profile;
  return (
    <Card>
      <CardHeader><CardTitle>Personal Profile</CardTitle><CardDescription>Sourced from Insured Person Master (ip_master).</CardDescription></CardHeader>
      <CardContent>
        {!p ? <p className="text-sm text-muted-foreground">No profile on record.</p> : (
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">SSN</dt><dd className="font-mono">{p.ssn}</dd>
            <dt className="text-muted-foreground">Name</dt><dd>{p.first_name} {p.last_name}</dd>
            <dt className="text-muted-foreground">Date of Birth</dt><dd>{p.dob ?? '—'}</dd>
            <dt className="text-muted-foreground">Gender</dt><dd>{p.gender ?? '—'}</dd>
            <dt className="text-muted-foreground">Mobile</dt><dd>{p.mobile_phone ?? '—'}</dd>
            <dt className="text-muted-foreground">Email</dt><dd>{p.email ?? '—'}</dd>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function Contributions() {
  const { data, isLoading } = useExternalContributions();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.contributions ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>Contribution History</CardTitle><CardDescription>Annual contribution summary (ip_wages_ann_sum).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No contribution records.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Year</TableHead><TableHead>Weeks</TableHead><TableHead>Wages</TableHead><TableHead>Contributions</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r: any, i: number) => (
              <TableRow key={i}><TableCell>{r.year_paid}</TableCell><TableCell>{r.weeks_paid ?? '—'}</TableCell><TableCell>{r.wages_paid ?? '—'}</TableCell><TableCell>{r.contributions_paid ?? '—'}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Employment() {
  const { data, isLoading } = useExternalEmploymentHistory();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.employment ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>Employment History</CardTitle><CardDescription>Employers you contributed under (ip_employer).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No employment history on record.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Employer</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Occupation</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((r: any, i: number) => (
              <TableRow key={i}><TableCell className="font-mono">{r.regno}</TableCell><TableCell>{r.start_date ?? '—'}</TableCell><TableCell>{r.end_date ?? 'Current'}</TableCell><TableCell>{r.occup_code ?? '—'}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ApplyList() {
  const { data, isLoading, error } = useProductApplicability();
  const { persona } = useClaimantPersona();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (error) return <Card><CardContent className="py-6 text-sm text-destructive">{(error as Error).message}</CardContent></Card>;
  const products = data ?? [];
  if (products.length === 0) {
    return (
      <Card><CardHeader>
        <CardTitle className="text-base">No benefits available online</CardTitle>
        <CardDescription>Admin must publish a product version with a participant config.</CardDescription>
      </CardHeader></Card>
    );
  }
  const canApplyForSelf = !!persona?.flags?.canApplyForSelf;
  const canApplyForOthers = !!persona?.flags?.canApplyForOthers;
  const forSelf = products.filter(p => p.allowsSelf);
  const forOthers = products.filter(p => p.allowsOthers);

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Apply for myself</h2>
          <p className="text-sm text-muted-foreground">
            {canApplyForSelf
              ? 'Benefits you can apply for as the insured person.'
              : 'Link your SSN to apply for benefits as the insured person.'}
          </p>
        </div>
        <ProductGrid products={forSelf} disabled={!canApplyForSelf} disabledHint="Link your SSN to enable" />
      </section>
      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Apply for someone else</h2>
          <p className="text-sm text-muted-foreground">
            Only products whose configuration allows a guardian, payee, representative or next-of-kin to file are listed here.
          </p>
        </div>
        {forOthers.length === 0 ? (
          <Card><CardContent className="py-6 text-sm text-muted-foreground">No products currently permit a non-self applicant.</CardContent></Card>
        ) : (
          <ProductGrid products={forOthers} disabled={!canApplyForOthers} disabledHint="You need a verified guardian / payee / representative link to file for others" />
        )}
      </section>
    </div>
  );
}

function ProductGrid({ products, disabled, disabledHint }: { products: ApplicableProduct[]; disabled: boolean; disabledHint: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {products.map(p => {
        const card = (
          <Card className={`h-full ${disabled ? 'opacity-60' : 'hover:shadow-md'}`}>
            <CardHeader>
              <CardTitle className="text-base">{p.benefit_name}</CardTitle>
              <CardDescription>
                {p.category} · {p.payment_type}
                {p.requiresDeceased && <> · <Badge variant="secondary">requires deceased</Badge></>}
              </CardDescription>
            </CardHeader>
            {disabled && <CardContent className="text-xs text-muted-foreground">{disabledHint}</CardContent>}
          </Card>
        );
        return disabled
          ? <div key={p.id}>{card}</div>
          : <Link key={p.id} to={`/claimant/apply/${p.benefit_code}`}>{card}</Link>;
      })}
    </div>
  );
}

function ApplyForm() {
  const { productCode } = useParams<{ productCode: string }>();
  const { persona } = useClaimantPersona();
  if (!productCode) return <p className="text-sm text-destructive">Missing product.</p>;
  const selfVerified = !!persona?.flags?.canApplyForSelf;
  return (
    <div className="space-y-3">
      {!selfVerified && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-3 px-4 text-sm">
            We could not verify your Social Security record yet. You can submit this application, but
            contribution prechecks will be unavailable until your record is linked.
          </CardContent>
        </Card>
      )}
      <PortalFormRenderer productCode={productCode} />
    </div>
  );
}

function Claims() {
  const { data, isLoading } = useExternalClaims();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.claims ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>Claims</CardTitle><CardDescription>All claims connected to you (bn_claim).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No claims yet.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Claim Number</TableHead><TableHead>Status</TableHead><TableHead>Submitted</TableHead><TableHead>Decision</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell><Link className="text-primary hover:underline font-mono" to={`/claimant/claims/${c.claim_number}`}>{c.claim_number}</Link></TableCell>
                <TableCell><Badge>{c.status}</Badge></TableCell>
                <TableCell>{c.submission_date ?? '—'}</TableCell>
                <TableCell>{c.decision_date ?? '—'}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ClaimDetail() {
  const { claimNumber } = useParams<{ claimNumber: string }>();
  const { data, isLoading } = useExternalClaimStatus(claimNumber);
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  return (
    <Card>
      <CardHeader><CardTitle>Claim {claimNumber}</CardTitle><CardDescription>Status driven by Internal BN.</CardDescription></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>Status: <Badge>{data?.claim?.status}</Badge></div>
        <div>Submitted: {data?.claim?.submission_date}</div>
        {data?.decision && <div>Decision: {data.decision.decision_type}</div>}
        <div>Payments: {data?.payments?.length ?? 0}</div>
      </CardContent>
    </Card>
  );
}

function Entitlements() {
  const { data, isLoading } = useExternalAwards();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.awards ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>Entitlements</CardTitle><CardDescription>Active and historical awards / pensions (bn_award).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No awards on record.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Award #</TableHead><TableHead>Type</TableHead><TableHead>Start</TableHead><TableHead>Rate</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono">{a.award_number ?? a.id.slice(0,8)}</TableCell>
                <TableCell>{a.award_type ?? '—'}</TableCell>
                <TableCell>{a.start_date ?? '—'}</TableCell>
                <TableCell>{a.weekly_rate ?? a.monthly_rate ?? '—'}</TableCell>
                <TableCell><Badge>{a.status}</Badge></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Payments() {
  const { data, isLoading } = useExternalPayments();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const rows = data?.payments ?? [];
  return (
    <Card>
      <CardHeader><CardTitle>Payments</CardTitle><CardDescription>Benefit payments to you (bn_payment_instruction).</CardDescription></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No payments recorded.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Gross</TableHead><TableHead>Net</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((p: any) => (
              <TableRow key={p.id}><TableCell>{p.payment_date}</TableCell><TableCell>{p.gross_amount}</TableCell><TableCell>{p.net_amount ?? p.gross_amount}</TableCell><TableCell><Badge>{p.status}</Badge></TableCell></TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Messages() {
  const { data, isLoading } = useExternalMessages();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const rows = data?.messages ?? [];
  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
      {rows.map((m: any) => (
        <Card key={m.id}><CardHeader><CardTitle className="text-base">{m.subject ?? m.template_code ?? 'Message'}</CardTitle><CardDescription>{m.created_at}</CardDescription></CardHeader></Card>
      ))}
    </div>
  );
}

function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  return <ExternalTaskForm taskId={taskId!} />;
}
