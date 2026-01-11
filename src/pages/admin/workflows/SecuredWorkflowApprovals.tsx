import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ShieldCheck, Clock, AlertTriangle, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { MODULE_NAMES } from '@/hooks/useActionPermission';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SecuredTask {
  id: string;
  instance_id: string;
  step_name: string;
  workflow_name: string;
  source_record_id: string | null;
  source_record_name: string | null;
  secured_table: string | null;
  secured_module_name: string | null;
  status: string;
  due_at: string | null;
  created_at: string;
  has_data_access: boolean;
  visible_fields: string[];
  editable_fields: string[];
  access_reason: string;
}

export default function SecuredWorkflowApprovals() {
  const { user, isAdmin } = useSupabaseAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('Pending');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['secured-workflow-tasks', user?.id, statusFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's roles and designation
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('designation_id')
        .eq('id', user.id)
        .single();

      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const roleNames = userRoles?.map((r) => r.role) || [];

      // Get workflow tasks assigned to user
      let query = supabase
        .from('workflow_tasks')
        .select(`
          id,
          instance_id,
          step_name,
          status,
          due_at,
          created_at,
          assigned_role,
          assigned_designation,
          assigned_to,
          workflow_instances!inner(
            id,
            workflow_id,
            workflow_name,
            source_record_id,
            source_record_name,
            workflow_definitions!inner(
              secured_module_id,
              secured_table,
              app_modules(display_name)
            )
          )
        `)
        .eq('status', statusFilter as any);

      const { data: tasksData, error } = await query;
      if (error) throw error;

      // Filter tasks by assignment and apply security checks
      const filteredTasks: SecuredTask[] = [];

      for (const task of tasksData || []) {
        // Check if task is assigned to this user
        const isAssignedByRole = task.assigned_role && roleNames.includes(task.assigned_role as any);
        const isAssignedByDesignation = task.assigned_designation && 
          userProfile?.designation_id === task.assigned_designation;
        const isDirectlyAssigned = task.assigned_to === user.id;

        if (!isAssignedByRole && !isAssignedByDesignation && !isDirectlyAssigned && !isAdmin) {
          continue; // Skip if not assigned
        }

        const instance = task.workflow_instances as any;
        const definition = instance?.workflow_definitions;
        const securedTable = definition?.secured_table;
        const securedModuleName = definition?.app_modules?.display_name || null;

        let hasDataAccess = true;
        let visibleFields: string[] = [];
        let editableFields: string[] = [];
        let accessReason = 'No security binding';

        // If workflow is secured, check data access
        if (securedTable && !isAdmin) {
          try {
            const { data: accessResult } = await (supabase.rpc as any)('check_workflow_task_access', {
              _user_id: user.id,
              _workflow_instance_id: task.instance_id,
              _action: 'view'
            });

            if (accessResult) {
              hasDataAccess = accessResult.allowed || false;
              accessReason = accessResult.reason || 'Access checked';
              
              if (accessResult.visible_fields) {
                visibleFields = accessResult.visible_fields
                  .filter((f: any) => f.can_view)
                  .map((f: any) => f.field_name);
              }
              if (accessResult.editable_fields) {
                editableFields = accessResult.editable_fields.map((f: any) => f.field_name);
              }
            }
          } catch (err) {
            console.error('Error checking task access:', err);
            hasDataAccess = false;
            accessReason = 'Security check failed';
          }
        } else if (isAdmin) {
          accessReason = 'Admin access';
        }

        // Only include tasks where user has data access
        if (hasDataAccess) {
          filteredTasks.push({
            id: task.id,
            instance_id: task.instance_id,
            step_name: task.step_name,
            workflow_name: instance?.workflow_name || 'Unknown',
            source_record_id: instance?.source_record_id,
            source_record_name: instance?.source_record_name,
            secured_table: securedTable,
            secured_module_name: securedModuleName,
            status: task.status,
            due_at: task.due_at,
            created_at: task.created_at,
            has_data_access: hasDataAccess,
            visible_fields: visibleFields,
            editable_fields: editableFields,
            access_reason: accessReason,
          });
        }
      }

      return filteredTasks;
    },
    enabled: !!user?.id,
  });

  const getOverdueStatus = (dueAt: string | null) => {
    if (!dueAt) return null;
    const due = new Date(dueAt);
    const now = new Date();
    if (due < now) return 'overdue';
    const hoursRemaining = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursRemaining < 24) return 'due-soon';
    return null;
  };

  return (
    <PermissionWrapper moduleName={MODULE_NAMES.WORKFLOW_MANAGEMENT}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Secured Workflow Approvals
          </h1>
          <p className="text-muted-foreground">
            View and process workflow tasks filtered by your data access permissions
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Status:</span>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="InProgress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Secured Tasks</CardTitle>
            <CardDescription>
              Tasks are filtered based on data access policies. Only tasks for records you have permission to view are shown.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Security</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : tasks?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No tasks found matching your filter and access permissions
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks?.map((task) => {
                    const overdueStatus = getOverdueStatus(task.due_at);
                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.workflow_name}</TableCell>
                        <TableCell>{task.step_name}</TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {task.source_record_name || task.source_record_id || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {task.secured_table ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              {task.secured_module_name || 'Secured'}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Open</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={task.status === 'Pending' ? 'outline' : 'default'}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.due_at ? (
                            <div className="flex items-center gap-2">
                              {overdueStatus === 'overdue' && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                              {overdueStatus === 'due-soon' && (
                                <Clock className="h-4 w-4 text-amber-500" />
                              )}
                              <span className={
                                overdueStatus === 'overdue' 
                                  ? 'text-destructive' 
                                  : overdueStatus === 'due-soon' 
                                    ? 'text-amber-600' 
                                    : ''
                              }>
                                {format(new Date(task.due_at), 'MMM dd, HH:mm')}
                              </span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/workflow-instances/${task.instance_id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Access Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">About Security Filtering</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tasks shown here are filtered based on your role's data access policies. 
              For secured workflows, you will only see tasks for records within your 
              department or access scope. Field-level visibility is also enforced when 
              viewing task details.
            </p>
          </CardContent>
        </Card>
      </div>
    </PermissionWrapper>
  );
}