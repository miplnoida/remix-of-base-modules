import { useParams, useNavigate } from "react-router-dom";
import { useApplicationFormDefinition } from "@/hooks/bn/useApplicationFormDefinition";
import { ApplicationFormEngine } from "@/components/bn/forms/ApplicationFormEngine";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

const BENEFIT_PARAM_TO_CODE: Record<string, string> = {
  sickness: 'SICKNESS',
  maternity: 'MATERNITY',
  'employment-injury': 'EMPLOYMENT_INJURY',
  'funeral-grant': 'FUNERAL_GRANT',
  'age-benefit': 'AGE_BENEFIT',
  invalidity: 'INVALIDITY',
  survivors: 'SURVIVORS',
  disablement: 'DISABLEMENT',
  'medical-expense': 'MEDICAL_EXPENSE',
  'non-contributory-pension': 'NON_CONTRIBUTORY_PENSION',
  'employment-injury-death': 'EMPLOYMENT_INJURY_DEATH',
};

const BenefitApplicationFormPage = () => {
  const { benefitType } = useParams<{ benefitType: string }>();
  const navigate = useNavigate();
  const auth: any = (() => { try { return useAuth(); } catch { return {}; } })();
  const userCode = auth?.user?.user_code ?? auth?.user?.email ?? 'STAFF';

  const productCode = BENEFIT_PARAM_TO_CODE[benefitType ?? ''] ?? (benefitType ?? '').toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  const { data, isLoading, error } = useApplicationFormDefinition(productCode, today, 'ASSISTED_OFFLINE');

  return (
    <div className="container mx-auto p-4 space-y-4">
      {isLoading && (
        <Card><CardContent className="p-6 space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </CardContent></Card>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load form</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}
      {data && (
        <ApplicationFormEngine
          definition={data}
          channel="ASSISTED_OFFLINE"
          userCode={userCode}
          onSubmitted={() => navigate(-1)}
        />
      )}
    </div>
  );
};

export default BenefitApplicationFormPage;
