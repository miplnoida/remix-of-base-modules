import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useTemplatePolicyMatrix, STAGE_LABELS } from '@/hooks/useAuditCommunicationStages';

export function TemplatePolicyMatrix() {
  const { data: policies = [], isLoading } = useTemplatePolicyMatrix();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading policy matrix...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Template Policy Matrix
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Defines which template category and minimum version is required for each communication/report stage.
        </p>
      </CardHeader>
      <CardContent>
        {policies.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No template policies configured. All templates are accepted for all stages.
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b">
              <div className="col-span-3">Stage</div>
              <div className="col-span-3">Required Category</div>
              <div className="col-span-2">Min Version</div>
              <div className="col-span-2">Mandatory</div>
              <div className="col-span-2">Status</div>
            </div>

            {policies.map((policy: any) => (
              <div key={policy.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-md hover:bg-muted/50 text-sm">
                <div className="col-span-3">
                  <span className="font-medium">
                    {STAGE_LABELS[policy.stage_code] || policy.stage_code}
                  </span>
                </div>
                <div className="col-span-3">
                  <Badge variant="outline" className="text-[10px]">
                    {policy.required_template_category || 'Any'}
                  </Badge>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {policy.min_version ? `v${policy.min_version}+` : 'Any'}
                </div>
                <div className="col-span-2">
                  {policy.is_mandatory ? (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px]">Required</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px]">Optional</Badge>
                  )}
                </div>
                <div className="col-span-2">
                  {policy.is_active ? (
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground text-xs">
                      <XCircle className="h-3 w-3" /> Inactive
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
