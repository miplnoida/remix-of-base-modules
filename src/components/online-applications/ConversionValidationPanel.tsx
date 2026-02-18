import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { ConversionValidationResult } from '@/hooks/useValidateApplicationForConversion';

interface ConversionValidationPanelProps {
  isLoading: boolean;
  result: ConversionValidationResult | null | undefined;
  className?: string;
}

export function ConversionValidationPanel({ isLoading, result, className }: ConversionValidationPanelProps) {
  if (isLoading) {
    return (
      <Alert className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Validating application data…</AlertTitle>
        <AlertDescription className="text-muted-foreground text-xs">
          Checking against system rules before conversion.
        </AlertDescription>
      </Alert>
    );
  }

  if (!result) return null;

  if (result.already_converted) {
    return (
      <Alert className={className}>
        <CheckCircle2 className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-700">Already Converted</AlertTitle>
        <AlertDescription className="text-blue-600 text-xs">
          This application has already been converted to an IP record in the system.
        </AlertDescription>
      </Alert>
    );
  }

  if (result.error_count === 0 && result.warning_count === 0) {
    return (
      <Alert className={`border-green-200 bg-green-50 ${className}`}>
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Ready for Conversion</AlertTitle>
        <AlertDescription className="text-green-700 text-xs">
          All fields validated successfully. This application can be converted to an IP record.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {result.error_count > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            Conversion Blocked
            <Badge variant="destructive" className="text-xs">{result.error_count} error{result.error_count !== 1 ? 's' : ''}</Badge>
          </AlertTitle>
          <AlertDescription>
            <p className="text-xs mb-2">The following issues must be resolved before this application can be converted:</p>
            <ul className="space-y-1">
              {result.errors.map((err, i) => (
                <li key={i} className="text-xs flex items-start gap-1">
                  <span className="text-destructive-foreground font-bold mt-0.5">•</span>
                  <span><span className="font-medium">[{err.type}]</span> {err.message}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {result.warning_count > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 flex items-center gap-2">
            Data Truncation Warnings
            <Badge className="bg-amber-200 text-amber-800 text-xs">{result.warning_count} warning{result.warning_count !== 1 ? 's' : ''}</Badge>
          </AlertTitle>
          <AlertDescription>
            <p className="text-xs text-amber-700 mb-2">These fields will be automatically truncated to fit system limits:</p>
            <ul className="space-y-1">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-xs flex items-start gap-1 text-amber-800">
                  <span className="font-bold mt-0.5">•</span>
                  <span>{w.message}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
