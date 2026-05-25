/**
 * Generate Notice — wraps GenerateNoticeDialog as a standalone page entry point.
 */
import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PermissionButton } from '@/components/ui/permission-button';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Plus } from 'lucide-react';
import { GenerateNoticeDialog } from '@/components/compliance/GenerateNoticeDialog';
import { isComplianceFeatureEnabled } from '@/lib/compliance/featureToggles';

const MODULE = 'manage_compliance';

export default function GenerateNoticePage() {
  const [open, setOpen] = useState(false);
  const enabled = isComplianceFeatureEnabled('notices.generate');

  return (
    <PermissionWrapper moduleName={MODULE}>
      <div className="container mx-auto p-6 space-y-4">
        <PageHeader title="Generate Notice" subtitle="Create a compliance notice from configured templates." />
        {!enabled ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Notice generation is disabled in feature toggles.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <p className="text-muted-foreground">Pick a template from Administration › Notice Templates and fill merge fields.</p>
              <PermissionButton moduleName={MODULE} actionName="create" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Notice
              </PermissionButton>
            </CardContent>
          </Card>
        )}
        <GenerateNoticeDialog open={open} onOpenChange={setOpen} />
      </div>
    </PermissionWrapper>
  );
}
