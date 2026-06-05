import { useParams } from 'react-router-dom';
import { useApplicationFormDefinition } from '@/hooks/bn/useApplicationFormDefinition';
import { ApplicationFormEngine } from '@/components/bn/forms/ApplicationFormEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Public-facing benefit application. Same engine, channel=PUBLIC.
 * Hides internal-only fields/sections and enforces document upload + eligibility.
 */
export default function PublicBenefitApplication() {
  const { productCode } = useParams<{ productCode: string }>();
  const today = new Date().toISOString().slice(0, 10);
  const { data, isLoading, error } = useApplicationFormDefinition(productCode, today, 'PUBLIC');

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto max-w-3xl space-y-4">
        <Card>
          <CardHeader><CardTitle>Apply for Benefit</CardTitle></CardHeader>
          <CardContent>
            {isLoading && <Skeleton className="h-64 w-full" />}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Form unavailable</AlertTitle>
                <AlertDescription>{(error as Error).message}</AlertDescription>
              </Alert>
            )}
            {data && (
              <ApplicationFormEngine
                definition={data}
                channel="PUBLIC"
                userCode="PUBLIC"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
