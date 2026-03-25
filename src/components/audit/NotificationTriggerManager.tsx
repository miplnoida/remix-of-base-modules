import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Loader2, Users, UserCheck, Building2 } from 'lucide-react';
import { useNotificationTriggers, useUpdateNotificationTrigger } from '@/hooks/useAuditNotificationTriggers';

const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800 border-red-300',
  High: 'bg-orange-100 text-orange-800 border-orange-300',
  Normal: 'bg-blue-100 text-blue-800 border-blue-300',
  Low: 'bg-muted text-muted-foreground',
};

export function NotificationTriggerManager() {
  const { data: triggers = [], isLoading } = useNotificationTriggers();
  const updateTrigger = useUpdateNotificationTrigger();

  const handleToggle = (id: string, field: keyof typeof triggers[0], value: boolean) => {
    updateTrigger.mutate({ id, updates: { [field]: value } as any });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading triggers...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Auto-Notification Triggers
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Configure which audit events automatically fire notifications.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b">
            <div className="col-span-4">Event</div>
            <div className="col-span-1 text-center">Active</div>
            <div className="col-span-1 text-center">Auto</div>
            <div className="col-span-1 text-center">Lead</div>
            <div className="col-span-1 text-center">Team</div>
            <div className="col-span-1 text-center">Auditee</div>
            <div className="col-span-1 text-center">Priority</div>
            <div className="col-span-2">Category</div>
          </div>

          {triggers.map((trigger) => (
            <div
              key={trigger.id}
              className={`grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-md text-sm transition-colors ${
                trigger.is_enabled ? 'hover:bg-muted/50' : 'opacity-50 bg-muted/20'
              }`}
            >
              <div className="col-span-4 min-w-0">
                <p className="font-medium text-sm truncate">{trigger.event_label}</p>
                {trigger.description && (
                  <p className="text-[10px] text-muted-foreground truncate">{trigger.description}</p>
                )}
              </div>
              <div className="col-span-1 flex justify-center">
                <Switch
                  checked={trigger.is_enabled}
                  onCheckedChange={(v) => handleToggle(trigger.id, 'is_enabled', v)}
                  className="scale-75"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <Switch
                  checked={trigger.auto_fire}
                  onCheckedChange={(v) => handleToggle(trigger.id, 'auto_fire', v)}
                  disabled={!trigger.is_enabled}
                  className="scale-75"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <Switch
                  checked={trigger.notify_team_lead}
                  onCheckedChange={(v) => handleToggle(trigger.id, 'notify_team_lead', v)}
                  disabled={!trigger.is_enabled}
                  className="scale-75"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <Switch
                  checked={trigger.notify_all_team}
                  onCheckedChange={(v) => handleToggle(trigger.id, 'notify_all_team', v)}
                  disabled={!trigger.is_enabled}
                  className="scale-75"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <Switch
                  checked={trigger.notify_auditee}
                  onCheckedChange={(v) => handleToggle(trigger.id, 'notify_auditee', v)}
                  disabled={!trigger.is_enabled}
                  className="scale-75"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <Badge className={`text-[9px] ${PRIORITY_COLORS[trigger.default_priority] || ''}`}>
                  {trigger.default_priority}
                </Badge>
              </div>
              <div className="col-span-2">
                <Badge variant="outline" className="text-[9px]">
                  {trigger.default_template_category || '-'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
