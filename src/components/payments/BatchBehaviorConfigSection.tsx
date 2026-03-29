import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings } from 'lucide-react';
import { usePaymentModuleConfig, useUpdatePaymentConfig } from '@/hooks/usePaymentModuleConfig';

const BatchBehaviorConfigSection: React.FC = () => {
  const { data: configs } = usePaymentModuleConfig();
  const updateConfig = useUpdatePaymentConfig();

  const getConfigEnabled = (key: string) => {
    const cfg = configs?.find(c => c.config_key === key);
    return cfg?.config_value?.enabled === true;
  };

  const handleToggle = (key: string, current: boolean) => {
    updateConfig.mutate({ key, value: { enabled: !current } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          Batch Behavior Configuration
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Control batch creation and payment entry restrictions based on date rules.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Allow new batch when previous-date batch is still open</Label>
            <p className="text-xs text-muted-foreground">
              When disabled, cashiers cannot create a new batch if they have an unclosed batch from a previous date.
            </p>
          </div>
          <Switch
            checked={getConfigEnabled('allow_new_batch_with_previous_open')}
            onCheckedChange={() => handleToggle('allow_new_batch_with_previous_open', getConfigEnabled('allow_new_batch_with_previous_open'))}
            disabled={updateConfig.isPending}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Allow current-date payments in previous-date batches</Label>
            <p className="text-xs text-muted-foreground">
              When disabled, batch selection on payment screens will only show batches matching today's date (except Cash Details and Batch Closing).
            </p>
          </div>
          <Switch
            checked={getConfigEnabled('allow_current_date_payment_in_old_batch')}
            onCheckedChange={() => handleToggle('allow_current_date_payment_in_old_batch', getConfigEnabled('allow_current_date_payment_in_old_batch'))}
            disabled={updateConfig.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchBehaviorConfigSection;
