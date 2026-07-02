/**
 * EPIC-04A §5 — Matter cross-module quick links.
 */
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, User, FileWarning, Wallet, FolderOpen, ClipboardCheck, ExternalLink } from "lucide-react";

interface Props {
  lgCaseId: string;
  caseData: any;
}

export function MatterQuickLinks({ lgCaseId, caseData }: Props) {
  const employerId = caseData?.employer_id ?? null;
  const personId = caseData?.person_id ?? null;
  const complianceCaseId = caseData?.compliance_case_id ?? null;
  const benefitClaimId = caseData?.benefit_claim_id ?? caseData?.claim_id ?? null;
  const intakeId = caseData?.intake_id ?? lgCaseId;
  const matterNo = caseData?.lg_case_no ?? "";

  const links: Array<{ to: string; icon: any; label: string; sub?: string } | null> = [
    employerId && { to: `/employers/${employerId}`, icon: Building2, label: "Employer", sub: caseData?.legacy_employer_name },
    personId && { to: `/insured-persons/${personId}`, icon: User, label: "Insured Person", sub: caseData?.legacy_person_name },
    complianceCaseId && { to: `/compliance/cases/${complianceCaseId}`, icon: FileWarning, label: "Compliance Case", sub: String(complianceCaseId).slice(0, 8) },
    benefitClaimId && { to: `/bn/claims/${benefitClaimId}`, icon: FileWarning, label: "Benefit Matter", sub: String(benefitClaimId).slice(0, 8) },
    { to: `/legal/lg/recovery-workbench?matter=${encodeURIComponent(matterNo)}`, icon: Wallet, label: "Recovery Workbench" },
    { to: `/legal/lg/cases/${lgCaseId}?tab=documents`, icon: FolderOpen, label: "Documents" },
    intakeId && { to: `/legal/cases/intake/${intakeId}`, icon: ClipboardCheck, label: "Intake" },
  ];

  const visible = links.filter(Boolean) as Array<{ to: string; icon: any; label: string; sub?: string }>;
  if (visible.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex flex-wrap gap-2">
          {visible.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                className="inline-flex items-center gap-1.5 border rounded-md px-2.5 py-1 text-xs hover:bg-accent transition-colors"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{l.label}</span>
                {l.sub && <span className="text-muted-foreground">· {l.sub}</span>}
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default MatterQuickLinks;
