import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Scroll, Landmark, Briefcase, Users, MessageSquare, Plus, Inbox } from "lucide-react";

/**
 * Phase 4 — Legal Services Hub.
 *
 * Single entry point for every "request to legal" workflow. All requests share the same
 * underlying lg_contract_review table (discriminated by contract_type) so this hub simply
 * funnels users into the unified intake/detail screens with the right preset.
 */

type Service = {
  type: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SERVICES: Service[] = [
  { type: "INTERNAL_LEGAL_ADVICE", label: "Legal Advice Request", description: "Ask Legal for written advice on any matter.", icon: MessageSquare },
  { type: "CONTRACT_REVIEW",       label: "Contract Review",       description: "Review of a contract or agreement draft.",   icon: FileText },
  { type: "POLICY_REVIEW",         label: "Policy Review",         description: "Legal review of a draft policy.",            icon: Scroll },
  { type: "MOU_REVIEW",            label: "MOU / NDA Review",      description: "Memoranda of Understanding and NDAs.",       icon: Briefcase },
  { type: "PROCUREMENT_REVIEW",    label: "Procurement Review",    description: "RFP/tender legal review.",                   icon: Landmark },
  { type: "OTHER_DOCUMENT_REVIEW", label: "Board / Executive Matter", description: "Board instructions and executive matters.", icon: Users },
];

export default function LegalServicesHub() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Legal Services"
        subtitle="Single entry point for all requests to the Legal department"
        breadcrumbs={[{ label: "Legal", href: "/legal/lg/dashboard" }, { label: "Legal Services" }]}
      />

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link to="/legal/contract-review/dashboard"><Inbox className="h-4 w-4 mr-2" /> All Requests</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/legal/contract-review/mine">My Requests</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/legal/workbench?tab=referrals">Department Referrals</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map(({ type, label, description, icon: Icon }) => (
          <Card key={type} className="hover:shadow-md transition">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                <div>
                  <CardTitle className="text-base">{label}</CardTitle>
                  <CardDescription className="text-xs">{description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm" asChild>
                <Link to={`/legal/contract-review/new?type=${type}`}><Plus className="h-4 w-4 mr-1" /> New</Link>
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link to={`/legal/contract-review/dashboard?type=${type}`}>View list</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
