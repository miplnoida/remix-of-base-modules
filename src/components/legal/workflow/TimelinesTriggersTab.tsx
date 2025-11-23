import { useState } from 'react';
import { Edit, Search, CheckCircle, XCircle, Mail, Bell, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  mockTimelineTriggers,
  mockStages,
  mockStatuses,
  TimelineTriggerConfig
} from '@/data/mockLegalWorkflow';
import { TimelineTriggerFormDialog } from './TimelineTriggerFormDialog';

export function TimelinesTriggersTab() {
  const [triggers, setTriggers] = useState<TimelineTriggerConfig[]>(mockTimelineTriggers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingTrigger, setEditingTrigger] = useState<TimelineTriggerConfig | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Get all statuses and create entries for those without triggers
  const allStatusesWithTriggers = mockStatuses.map(status => {
    const existingTrigger = triggers.find(t => t.statusId === status.id);
    return existingTrigger || {
      id: `temp-${status.id}`,
      stageId: status.stageId,
      statusId: status.id,
      graceDays: 0,
      escalationDays: 0,
      reminderEveryDays: null,
      nextStatusId: null,
      sendInternalAlert: false,
      internalNotificationTemplateId: null,
      sendExternalLetter: false,
      letterTemplateId: null,
      createTask: false,
      taskTemplateId: null,
      actionMode: 'suggest' as const,
      active: false
    };
  });

  const filteredTriggers = allStatusesWithTriggers.filter(trigger => {
    const status = mockStatuses.find(s => s.id === trigger.statusId);
    const matchesSearch = status?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = filterStage === 'all' || trigger.stageId === filterStage;
    const matchesStatus = filterStatus === 'all' || trigger.statusId === filterStatus;
    return matchesSearch && matchesStage && matchesStatus;
  });

  const availableStatuses = filterStage === 'all' 
    ? mockStatuses 
    : mockStatuses.filter(s => s.stageId === filterStage);

  const handleEditTrigger = (trigger: TimelineTriggerConfig) => {
    setEditingTrigger(trigger);
    setIsFormOpen(true);
  };

  const handleSaveTrigger = (trigger: TimelineTriggerConfig) => {
    const existingIndex = triggers.findIndex(t => t.statusId === trigger.statusId);
    
    if (existingIndex >= 0) {
      setTriggers(triggers.map((t, i) => i === existingIndex ? trigger : t));
    } else {
      setTriggers([...triggers, { ...trigger, id: `trigger-${Date.now()}` }]);
    }
    
    setIsFormOpen(false);
    setEditingTrigger(null);
  };

  const handleToggleActive = (statusId: string) => {
    const existingTrigger = triggers.find(t => t.statusId === statusId);
    if (existingTrigger) {
      setTriggers(triggers.map(t => 
        t.statusId === statusId ? { ...t, active: !t.active } : t
      ));
    }
  };

  const getStageName = (stageId: string) => {
    return mockStages.find(s => s.id === stageId)?.name || 'Unknown';
  };

  const getStatusName = (statusId: string) => {
    return mockStatuses.find(s => s.id === statusId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Timelines & Triggers</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure automated actions and reminders based on time in status
          </p>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {mockStages.map(stage => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {availableStatuses.map(status => (
              <SelectItem key={status.id} value={status.id}>
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium whitespace-nowrap">Stage</th>
                <th className="text-left p-4 font-medium whitespace-nowrap min-w-[200px]">Status</th>
                <th className="text-center p-4 font-medium whitespace-nowrap">Grace Days</th>
                <th className="text-center p-4 font-medium whitespace-nowrap">Escalate After</th>
                <th className="text-center p-4 font-medium whitespace-nowrap">Reminder Every</th>
                <th className="text-left p-4 font-medium whitespace-nowrap">Next Status</th>
                <th className="text-center p-4 font-medium whitespace-nowrap">Alert</th>
                <th className="text-center p-4 font-medium whitespace-nowrap">Letter</th>
                <th className="text-center p-4 font-medium whitespace-nowrap">Task</th>
                <th className="text-center p-4 font-medium whitespace-nowrap">Active</th>
                <th className="text-right p-4 font-medium sticky right-0 bg-muted/50 z-10">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTriggers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center p-8 text-muted-foreground">
                    No statuses found
                  </td>
                </tr>
              ) : (
                filteredTriggers.map((trigger) => (
                  <tr key={trigger.statusId} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <Badge variant="outline" className="font-normal">
                        {getStageName(trigger.stageId)}
                      </Badge>
                    </td>
                    <td className="p-4 min-w-[200px]">
                      <div className="font-medium">{getStatusName(trigger.statusId)}</div>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      {trigger.graceDays > 0 ? (
                        <Badge variant="secondary">{trigger.graceDays}d</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      {trigger.escalationDays > 0 ? (
                        <Badge variant="secondary">{trigger.escalationDays}d</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      {trigger.reminderEveryDays ? (
                        <Badge variant="secondary">{trigger.reminderEveryDays}d</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {trigger.nextStatusId ? (
                        <div className="text-sm">{getStatusName(trigger.nextStatusId)}</div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {trigger.sendInternalAlert ? (
                        <Bell className="h-4 w-4 text-blue-600 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {trigger.sendExternalLetter ? (
                        <Mail className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {trigger.createTask ? (
                        <ClipboardList className="h-4 w-4 text-amber-600 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <Switch
                        checked={trigger.active}
                        onCheckedChange={() => handleToggleActive(trigger.statusId)}
                        disabled={!trigger.id.startsWith('trigger-')}
                      />
                    </td>
                    <td className="p-4 text-right sticky right-0 bg-card z-10">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTrigger(trigger)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TimelineTriggerFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        trigger={editingTrigger}
        onSave={handleSaveTrigger}
      />
    </div>
  );
}
