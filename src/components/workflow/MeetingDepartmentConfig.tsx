import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Building2, Bell } from 'lucide-react';
import { useTbOffices } from '@/hooks/useAdminData';
import { useOfficeDepartments } from '@/hooks/useOfficeDepartments';
import {
  useWorkflowMeetingDepartments,
  useAddWorkflowMeetingDepartment,
  useRemoveWorkflowMeetingDepartment,
} from '@/hooks/useWorkflowMeetingDepartments';
import { useUserCode } from '@/hooks/useUserCode';

interface MeetingDepartmentConfigProps {
  workflowId: string;
  stepId: string;
  actionId?: string;
  notifyAssignedPerson: boolean;
  onNotifyChange: (notify: boolean) => void;
}

export function MeetingDepartmentConfig({
  workflowId,
  stepId,
  actionId,
  notifyAssignedPerson,
  onNotifyChange,
}: MeetingDepartmentConfigProps) {
  const { userCode } = useUserCode();
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const { data: offices = [] } = useTbOffices();
  const { data: departments = [] } = useOfficeDepartments(selectedOffice || undefined);
  const { data: configuredDepts = [], isLoading } = useWorkflowMeetingDepartments(workflowId, stepId);
  const addDept = useAddWorkflowMeetingDepartment();
  const removeDept = useRemoveWorkflowMeetingDepartment();

  const handleAdd = async () => {
    if (!selectedOffice || !selectedDepartment) return;
    await addDept.mutateAsync({
      workflow_id: workflowId,
      step_id: stepId,
      action_id: actionId,
      office_code: selectedOffice,
      department_id: selectedDepartment,
      created_by: userCode || undefined,
    });
    setSelectedDepartment('');
  };

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-base">Meeting Department Configuration</CardTitle>
        </div>
        <CardDescription>
          Define which office locations and departments are responsible for meetings in this workflow step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notification Toggle */}
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <Bell className="h-4 w-4 text-amber-500" />
          <Switch checked={notifyAssignedPerson} onCheckedChange={onNotifyChange} />
          <div>
            <Label className="text-sm font-medium">Send Notification to Assigned Person</Label>
            <p className="text-xs text-muted-foreground">
              When enabled, the assigned person will receive an in-app notification when a meeting is scheduled.
            </p>
          </div>
        </div>

        {/* Add Department Row */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Office Location</Label>
            <Select value={selectedOffice} onValueChange={(v) => { setSelectedOffice(v); setSelectedDepartment(''); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select office" />
              </SelectTrigger>
              <SelectContent>
                {offices.map((o) => (
                  <SelectItem key={o.code} value={o.code}>{o.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Department</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={!selectedOffice}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={selectedOffice ? "Select department" : "Select office first"} />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!selectedOffice || !selectedDepartment || addDept.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Configured Departments Table */}
        {configuredDepts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Office Location</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configuredDepts.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline">{item.office?.description || item.office_code}</Badge>
                  </TableCell>
                  <TableCell>{item.department?.name || item.department_id}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeDept.mutate(item.id)}
                      disabled={removeDept.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground border rounded-md border-dashed">
            {isLoading ? 'Loading...' : 'No departments configured. Add office-department pairs above.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
