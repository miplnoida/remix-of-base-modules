import { PortalLandingTemplate } from '@/portals/_shared/PortalLandingTemplate';
import { FileText, ClipboardList, Coins, Upload, Banknote, ShieldCheck, Landmark, MessageSquare } from 'lucide-react';

export default function ClaimantLanding() {
  return (
    <PortalLandingTemplate
      brand="Social Security Self-Service Portal"
      role="CLAIMANT"
      hero={{
        title: 'Manage your Social Security benefits and contributions online.',
        subtitle: 'Apply for benefits, track claims, view your contribution history, manage payments and submit life certificates — securely, anytime.',
      }}
      ctas={[
        { label: 'Create an account', to: '/claimant/register' },
        { label: 'Sign in', to: '/login', variant: 'outline' },
        { label: 'Apply for a Benefit', to: '/claimant/apply', variant: 'outline' },
      ]}
      cards={[
        { title: 'Apply for Benefits', desc: 'Sickness, Maternity, Funeral, Survivors and more.', icon: FileText, to: '/claimant/apply' },
        { title: 'Track My Claims', desc: 'Status, decisions and next steps for each claim.', icon: ClipboardList, to: '/claimant/claims' },
        { title: 'Contribution History', desc: 'Annual wages, weeks paid and contributions.', icon: Coins, to: '/claimant/contributions' },
        { title: 'Upload Documents', desc: 'Send supporting documents securely.', icon: Upload, to: '/claimant/documents' },
        { title: 'View Payments', desc: 'EFT history for benefit payments and pensions.', icon: Banknote, to: '/claimant/payments' },
        { title: 'Life Certificate', desc: 'Annual proof-of-life for pensioners.', icon: ShieldCheck, to: '/claimant/life-certificates' },
        { title: 'Update Bank Details', desc: 'Change the account where payments arrive.', icon: Landmark, to: '/claimant/bank-details' },
        { title: 'Messages & Letters', desc: 'Official communications from SSB.', icon: MessageSquare, to: '/claimant/messages' },
      ]}
      dashboardPath="/claimant/dashboard"
    />
  );
}
