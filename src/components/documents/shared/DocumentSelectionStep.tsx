import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Info, ChevronRight, ShieldCheck, FileCheck, CheckCircle2,
  AlertTriangle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import {
  VerificationCategory, UnifiedDocument,
  CODES_REQUIRING_SUPPORTIVE, SUPPORTIVE_DOC_CODES,
} from './types';

interface VerifyType {
  code: string;
  description?: string;
}

interface DocumentSelectionStepProps {
  verificationCategories: VerificationCategory[];
  verifySelections: Record<string, string>;
  supportiveSelections: Record<string, string>;
  selectionErrors: Record<string, string>;
  verifyTypes: VerifyType[];
  verifyLoading: boolean;
  isEditable: boolean;
  canProceedToUpload: boolean;
  documents: UnifiedDocument[];
  pendingReupload?: Record<string, string>;
  externalDocFieldKeys?: Record<string, string>;
  platformOverrides?: Record<string, string>;
  onVerificationChange: (cat: VerificationCategory, code: string) => void;
  onSupportiveChange: (categoryId: string, code: string) => void;
  onProceedToUpload: () => void;
}

export function DocumentSelectionStep({
  verificationCategories,
  verifySelections,
  supportiveSelections,
  selectionErrors,
  verifyTypes,
  verifyLoading,
  isEditable,
  canProceedToUpload,
  documents,
  pendingReupload = {},
  externalDocFieldKeys = {},
  platformOverrides = {},
  onVerificationChange,
  onSupportiveChange,
  onProceedToUpload,
}: DocumentSelectionStepProps) {
  const supportiveDocOptions = verifyTypes.filter(v => SUPPORTIVE_DOC_CODES.includes(v.code));
  const activeDocuments = documents.filter(d => d.is_active !== false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Select Verification Documents</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Choose the document you will provide for each verification type. Fields marked with <span className="text-destructive font-medium">*</span> are mandatory.
        {Object.keys(pendingReupload).length > 0 && ' Changing a selection will deactivate previously uploaded documents for that verification.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {verificationCategories.map(cat => {
          const selectedCode = verifySelections[cat.fieldKey] || '';
          const needsSupportive = selectedCode && CODES_REQUIRING_SUPPORTIVE.includes(selectedCode);
          const hasError = selectionErrors[cat.fieldKey];
          const supportiveError = selectionErrors[`${cat.id}_supportive`];
          const hasPendingReupload = !!pendingReupload[cat.id];

          return (
            <Card key={cat.id} className={`border ${cat.isMandatory ? 'border-primary/30' : ''} ${hasError ? 'border-destructive' : ''} ${hasPendingReupload ? 'border-amber-400' : ''}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor={cat.fieldKey} className="font-medium text-sm">
                    {cat.label}
                    {cat.isMandatory && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      {cat.tooltip}
                    </TooltipContent>
                  </Tooltip>
                  {cat.autoSelectCode && !externalDocFieldKeys[cat.fieldKey] && !platformOverrides[cat.fieldKey] && !hasPendingReupload && (
                    <Badge variant="secondary" className="text-xs ml-auto">Auto-selected</Badge>
                  )}
                  {platformOverrides[cat.fieldKey] && !hasPendingReupload && (
                    <Badge variant="outline" className="text-xs ml-auto border-blue-400 text-blue-700 dark:text-blue-400">Replaced</Badge>
                  )}
                  {externalDocFieldKeys[cat.fieldKey] && !platformOverrides[cat.fieldKey] && !hasPendingReupload && (
                    <Badge variant="outline" className="text-xs ml-auto border-emerald-400 text-emerald-700 dark:text-emerald-400">From Document</Badge>
                  )}
                  {hasPendingReupload && (
                    <Badge variant="outline" className="text-xs ml-auto border-amber-400 text-amber-700 dark:text-amber-400 gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Re-upload needed
                    </Badge>
                  )}
                </div>

                <Select
                  value={selectedCode || undefined}
                  onValueChange={(v) => onVerificationChange(cat, v)}
                  disabled={!isEditable || verifyLoading}
                >
                  <SelectTrigger className={hasError ? 'border-destructive' : ''}>
                    <SelectValue placeholder={verifyLoading ? 'Loading...' : 'Select Document Type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {verifyTypes.map(v => (
                      <SelectItem key={v.code} value={v.code}>
                        {v.description || v.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasError && <p className="text-xs text-destructive">{hasError}</p>}

                {/* Re-upload warning */}
                {hasPendingReupload && (
                  <div className="p-2.5 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        Previous document deactivated. Upload a new {verifyTypes.find(v => v.code === pendingReupload[cat.id])?.description || pendingReupload[cat.id]} in the Upload Documents section.
                      </span>
                    </div>
                  </div>
                )}

                {/* Supportive document requirement */}
                {needsSupportive && (() => {
                  const supportiveCode = supportiveSelections[cat.id];
                  const matchingMandatory = supportiveCode
                    ? verificationCategories.find(other =>
                        other.id !== cat.id && verifySelections[other.fieldKey] === supportiveCode
                      )
                    : null;
                  const isSatisfied = matchingMandatory
                    ? activeDocuments.filter(d => d.verification_category === matchingMandatory.id && !d.is_supportive).length > 0
                    : false;

                  return (
                    <div className={`mt-2 p-3 rounded-md border space-y-2 ${isSatisfied ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-700' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'}`}>
                      <div className="flex items-center gap-2">
                        {isSatisfied ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              Supportive document satisfied via mandatory upload
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                              Supportive ID document required
                            </span>
                          </>
                        )}
                      </div>
                      {!isSatisfied && (
                        <p className="text-xs text-amber-600 dark:text-amber-500">
                          {verifyTypes.find(v => v.code === selectedCode)?.description} requires an Identification Card or Identification Letter as supporting evidence.
                        </p>
                      )}
                      <Select
                        value={supportiveSelections[cat.id] || undefined}
                        onValueChange={(v) => onSupportiveChange(cat.id, v)}
                        disabled={!isEditable}
                      >
                        <SelectTrigger className={`bg-background ${supportiveError && !isSatisfied ? 'border-destructive' : ''}`}>
                          <SelectValue placeholder="Select Supportive Document" />
                        </SelectTrigger>
                        <SelectContent>
                          {supportiveDocOptions.map(v => (
                            <SelectItem key={v.code} value={v.code}>
                              {v.description || v.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {supportiveError && !isSatisfied && <p className="text-xs text-destructive">{supportiveError}</p>}
                    </div>
                  );
                })()}

                {/* Show uploaded docs count */}
                {activeDocuments.filter(d => d.verification_category === cat.id).length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                      {activeDocuments.filter(d => d.verification_category === cat.id).length} active file(s)
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Proceed button */}
      {isEditable && (
        <div className="flex justify-end mt-4">
          <Button
            onClick={() => {
              if (!canProceedToUpload) {
                toast.error('Please complete all mandatory selections', {
                  description: Object.values(selectionErrors)[0],
                });
                return;
              }
              onProceedToUpload();
            }}
            className="gap-2"
          >
            Continue to Upload
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
