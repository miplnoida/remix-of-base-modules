import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  eligibilityStale?: boolean | null;
  calculationStale?: boolean | null;
  onRerunEligibility?: () => void;
  onRerunCalculation?: () => void;
}

export function ClaimStaleBanner({ eligibilityStale, calculationStale, onRerunEligibility, onRerunCalculation }: Props) {
  if (!eligibilityStale && !calculationStale) return null;
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Claim data changed</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>Re-run eligibility and calculation to reflect amendments.</span>
        <span className="flex gap-2">
          {eligibilityStale && (
            <Button size="sm" variant="outline" onClick={onRerunEligibility}>Re-run Eligibility</Button>
          )}
          {calculationStale && (
            <Button size="sm" variant="outline" onClick={onRerunCalculation}>Re-run Calculation</Button>
          )}
        </span>
      </AlertDescription>
    </Alert>
  );
}
