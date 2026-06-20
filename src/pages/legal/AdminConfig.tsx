import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackNavigation } from "@/components/ui/back-navigation";
import {
  Code, FileText, Building2, DollarSign, Workflow, ShieldCheck, Settings,
} from "lucide-react";

const sections = [
  { to: "/legal/admin/codesets",         title: "Code Sets",            desc: "Reference dropdown values for the Legal module",          icon: Code },
  { to: "/legal/admin/templates",        title: "Document Templates",   desc: "Letters, notices and PDFs via Core Template framework",   icon: FileText },
  { to: "/legal/admin/complainant",      title: "Complainant Settings", desc: "Default complainant info used in new cases",              icon: Building2 },
  { to: "/legal/admin/fees",             title: "Fee Configuration",    desc: "Fee rules, bundles and charges (lg_fee_rule, lg_fee_bundle)", icon: DollarSign },
  { to: "/legal/admin/policy",           title: "Workflow & Role Policy", desc: "Department profile, role mapping, per-action approvals", icon: Workflow },
  { to: "/legal/admin/waiver-policies",  title: "Waiver Policies",      desc: "Auto-approve thresholds and tiered waiver routing",       icon: ShieldCheck },
];

export default function AdminConfig() {
  return (
    <div className="p-6 space-y-6">
      <BackNavigation />
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Legal Administration</h1>
          <p className="text-sm text-muted-foreground">Choose a section to configure</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ to, title, desc, icon: Icon }) => (
          <Link key={to} to={to} className="block">
            <Card className="hover:border-primary transition-colors h-full">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <Icon className="h-6 w-6 text-primary mt-0.5" />
                <div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription>{desc}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Open →</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
