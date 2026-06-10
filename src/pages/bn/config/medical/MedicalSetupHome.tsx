import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, ClipboardList, Building2, GitBranch, Coins, Receipt, ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import { BnScreenRoleBanner } from '@/components/bn/shared';

const SECTIONS = [
  { to: '/bn/config/medical/procedures', icon: ClipboardList, title: 'Medical Procedures Catalog', desc: 'Code, name, category, specialty, pre-auth and board flags.' },
  { to: '/bn/config/medical/facility-availability', icon: Building2, title: 'Facility Availability Matrix', desc: 'Local, regional and international provider availability per procedure.' },
  { to: '/bn/config/medical/referral-rules', icon: GitBranch, title: 'Referral & Recommendation Rules', desc: 'Drives the local → regional → international decision path.' },
  { to: '/bn/config/medical/reimbursement-limits', icon: Coins, title: 'Reimbursement Limits', desc: 'Per-claim, per-procedure, per-expense, annual and lifetime caps.' },
  { to: '/bn/config/medical/expense-types', icon: Receipt, title: 'Expense Type Configuration', desc: 'Categories, default caps, receipt and invoice requirements.' },
  { to: '/bn/config/medical/review-rules', icon: ShieldCheck, title: 'Medical Review Rules', desc: 'Specialist report, medical board and pre-authorization triggers.' },
  { to: '/bn/config/medical/documents', icon: FileText, title: 'Medical Documents', desc: 'Required documents per procedure / jurisdiction.' },
];

export default function MedicalSetupHome() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Stethoscope className="h-8 w-8 text-primary" />
        <div>
          <h1 className="t-page-title">Medical Policy Library</h1>
          <p className="t-page-subtitle mt-1">Reusable medical board rules, certificate categories, disablement % rules, invalidity review intervals and provider rules.</p>
        </div>
      </div>

      <BnScreenRoleBanner
        role="library"
        productAssemblyHint
        description="Reusable medical policy library. Products like Invalidity, Disablement, Sickness and EI Medical link to this policy inside Product Catalog → Medical tab."
      />


      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link key={s.to} to={s.to} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <s.icon className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">{s.title}</CardTitle>
                    <CardDescription className="mt-1 text-xs">{s.desc}</CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
