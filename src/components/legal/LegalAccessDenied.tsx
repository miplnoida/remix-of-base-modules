import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { LegalRoleCode } from "@/hooks/legal/useLegalCapability";

interface Props {
  role: LegalRoleCode;
  requiredCap: string;
  pathname: string;
}

const REQUIRED_ROLE_HINT: Record<string, string> = {
  canManageRouting: "LEGAL_ADMIN",
  canManageTemplates: "LEGAL_ADMIN",
  canManageSla: "LEGAL_ADMIN",
  canManageReferenceData: "LEGAL_ADMIN",
  canAssignCase: "LEGAL_MANAGER or LEGAL_ADMIN",
  canRunIntegrityChecks: "LEGAL_MANAGER or LEGAL_ADMIN",
};

export default function LegalAccessDenied({ role, requiredCap, pathname }: Props) {
  const navigate = useNavigate();
  const hint = REQUIRED_ROLE_HINT[requiredCap] ?? "an authorized Legal role";

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <CardTitle>Access restricted</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            This Legal screen requires <span className="font-medium">{hint}</span>.
          </p>
          <p className="text-muted-foreground">
            Your current role{role ? <> is <span className="font-mono">{role}</span></> : " has no legal access"}.
          </p>
          <p className="text-xs text-muted-foreground break-all">{pathname}</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
            <Button onClick={() => navigate("/legal/dashboard")}>Legal home</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
