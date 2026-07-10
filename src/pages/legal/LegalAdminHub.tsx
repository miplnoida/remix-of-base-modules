import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Workflow,
  Database,
  MessageSquare,
  Shield,
  ArrowRight,
} from "lucide-react";

type AdminLink = { label: string; to: string; description?: string };
type AdminGroup = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  links: AdminLink[];
};

const groups: AdminGroup[] = [
  {
    id: "work-management",
    title: "Work Management",
    description: "Teams, staff, workbaskets, routing & assignment rules",
    icon: Users,
    links: [
      { label: "Teams", to: "/legal/admin/teams" },
      { label: "Staff", to: "/legal/admin/staff" },
      { label: "Routing Rules", to: "/legal/admin/routing" },
      { label: "Department Profile", to: "/legal/admin/profile" },
    ],
  },
  {
    id: "case-processing",
    title: "Case Processing",
    description: "Workflow, stages, SLA & policy configuration",
    icon: Workflow,
    links: [
      { label: "Case Workflow", to: "/legal/settings/workflow" },
      { label: "Case Statuses", to: "/legal/settings/statuses" },
      { label: "SLA Rules", to: "/legal/admin/sla-rules" },
      { label: "Stage → Template Mapping", to: "/legal/admin/stage-template-mapping" },
      { label: "Stage → Reference Mapping", to: "/legal/admin/stage-reference-mapping" },
      { label: "Stage Document Rules", to: "/legal/admin/stage-document-rules" },
      { label: "Policy Config", to: "/legal/admin/policy" },
      { label: "Fee Config", to: "/legal/admin/fees" },
      { label: "Fee Waiver Policies", to: "/legal/admin/waiver-policies" },
      { label: "Fee Mappings", to: "/legal/settings/fee-mappings" },
      { label: "Fee Bundles", to: "/legal/admin/fee-bundles" },
    ],
  },
  {
    id: "reference-data",
    title: "Reference Data",
    description: "Courts, judges, code sets, complainant types & legal references",
    icon: Database,
    links: [
      { label: "Courts & Judges", to: "/legal/admin/courts" },
      { label: "Hearing Types", to: "/legal/settings/hearing-types" },
      { label: "Code Sets", to: "/legal/admin/codesets" },
      { label: "Complainant Types", to: "/legal/admin/complainant" },
      { label: "Document Types", to: "/legal/admin/document-types" },
      { label: "Legal References Library", to: "/legal/admin/legal-references" },
      { label: "Reference Verification", to: "/legal/admin/legal-references/verification" },
      { label: "Territory Settings", to: "/legal/settings/territory" },
    ],
  },
  {
    id: "communications",
    title: "Communications",
    description: "Templates & numbering for letters and notices",
    icon: MessageSquare,
    links: [
      { label: "Template Management", to: "/legal/admin/templates" },
      { label: "Send Live Internal Notice (pilot)", to: "/legal/admin/live-case-assignment-notice", description: "Admin-only. Internal @mishainfotech.com domain pilot for LEGAL/INTERNAL_CASE_ASSIGNMENT_NOTICE." },
    ],
  },
  {
    id: "system",
    title: "System",
    description: "Roles, permissions, audit log & integrity checks",
    icon: Shield,
    links: [
      { label: "Legal Roles", to: "/legal/settings/roles" },
      { label: "Permissions", to: "/legal/admin/permissions" },
      { label: "Audit Log", to: "/legal/admin/audit" },
      { label: "Validation Report", to: "/legal/admin/validation" },
      { label: "Intake Validation", to: "/legal/admin/intake-validation" },
      { label: "Referral Integrity", to: "/legal/admin/referral-integrity" },
      { label: "Case Integrity", to: "/legal/admin/case-integrity" },
      { label: "Assignment Integrity", to: "/legal/admin/assignment-integrity" },
      { label: "Matter Workspace Integrity", to: "/legal/admin/matter-workspace-integrity" },
    ],
  },
];

export default function LegalAdminHub() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Legal Administration</h1>
        <p className="text-sm text-muted-foreground">
          Configuration and governance for the Legal department, grouped by function.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{group.title}</CardTitle>
                    <CardDescription>{group.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {group.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="flex items-center justify-between py-2 text-sm hover:text-primary"
                      >
                        <span>{link.label}</span>
                        <ArrowRight className="h-4 w-4 opacity-50" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
