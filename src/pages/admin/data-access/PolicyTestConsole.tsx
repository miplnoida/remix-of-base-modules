import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestTube, CheckCircle2, XCircle, AlertTriangle, Shield, Lock, User, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import { useTestWorkflowPolicy } from '@/hooks/useWorkflowSecurity';

export default function PolicyTestConsole() {
  const [activeTab, setActiveTab] = useState('data');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('view');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // Workflow test state
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [workflowTestResult, setWorkflowTestResult] = useState<any>(null);
  const testWorkflowPolicy = useTestWorkflowPolicy();

  const { data: users } = useQuery({
    queryKey: ['users-for-test'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: modules } = useQuery({
    queryKey: ['modules-for-test'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_modules').select('*').eq('is_enabled', true).order('display_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: workflows } = useQuery({
    queryKey: ['workflows-for-test'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_definitions')
        .select('id, name, secured_module_id, secured_table')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const runTest = async () => {
    if (!selectedUser || !selectedModule) {
      toast.error('Please select a user and module');
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await (supabase.rpc as any)('test_data_policy', {
        _test_user_id: selectedUser,
        _module_name: selectedModule,
        _action: selectedAction
      });
      
      if (error) throw error;
      setTestResult(data);
    } catch (err: any) {
      toast.error('Test failed: ' + err.message);
      setTestResult(null);
    } finally {
      setTesting(false);
    }
  };

  const runWorkflowTest = async () => {
    if (!selectedUser || !selectedWorkflow) {
      toast.error('Please select a user and workflow');
      return;
    }

    try {
      const result = await testWorkflowPolicy.mutateAsync({
        userId: selectedUser,
        workflowId: selectedWorkflow
      });
      setWorkflowTestResult(result);
    } catch (err: any) {
      toast.error('Test failed: ' + err.message);
      setWorkflowTestResult(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TestTube className="h-8 w-8" /> Policy Test Console
        </h1>
        <p className="text-muted-foreground">Test data access and workflow policies before deployment</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Data Policy Test
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" /> Workflow Policy Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Parameters</CardTitle>
              <CardDescription>Select a user, module, and action to test</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">User</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Module</label>
                  <Select value={selectedModule} onValueChange={setSelectedModule}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select module..." />
                    </SelectTrigger>
                    <SelectContent>
                      {modules?.map((mod: any) => (
                        <SelectItem key={mod.id} value={mod.name}>
                          {mod.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Action</label>
                  <Select value={selectedAction} onValueChange={setSelectedAction}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={runTest} disabled={testing} className="w-full">
                {testing ? 'Testing...' : 'Run Policy Test'}
              </Button>
            </CardContent>
          </Card>

          {testResult && (
            <div className="space-y-4">
              <Alert variant={testResult.effective_access?.allowed ? "default" : "destructive"}>
                {testResult.effective_access?.allowed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {testResult.effective_access?.allowed ? 'Access Granted' : 'Access Denied'}
                </AlertTitle>
                <AlertDescription>
                  {testResult.effective_access?.reason || 'User has access to perform this action.'}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5" /> User Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {testResult.user?.name}</p>
                      <p><strong>Email:</strong> {testResult.user?.email}</p>
                      <p><strong>Roles:</strong> {testResult.user?.roles?.join(', ') || 'None'}</p>
                      <p>
                        <strong>Admin:</strong>{' '}
                        {testResult.user?.is_admin ? (
                          <Badge className="bg-green-600">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Shield className="h-5 w-5" /> Module Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Module:</strong> {testResult.module?.display_name}</p>
                      <p><strong>Action:</strong> {testResult.action}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" /> Scope Rules Applied
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResult.scope_rules?.length > 0 ? (
                    <div className="space-y-2">
                      {testResult.scope_rules.map((rule: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted rounded flex justify-between items-center">
                          <span>{rule.target_table} - {rule.condition_type}: {rule.condition_value}</span>
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No scope rules apply.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" /> Field Rules Applied
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResult.field_rules?.length > 0 ? (
                    <div className="space-y-2">
                      {testResult.field_rules.map((rule: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted rounded flex justify-between items-center">
                          <span className="font-mono">{rule.field_name}</span>
                          <div className="flex gap-2">
                            <Badge variant={rule.can_view ? "default" : "secondary"}>
                              View: {rule.can_view ? '✓' : '✗'}
                            </Badge>
                            <Badge variant={rule.can_edit ? "default" : "secondary"}>
                              Edit: {rule.can_edit ? '✓' : '✗'}
                            </Badge>
                            <Badge variant={rule.masking_type === 'none' ? "outline" : "destructive"}>
                              {rule.masking_type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No field rules apply.</p>
                  )}
                </CardContent>
              </Card>

              {testResult.user_overrides?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" /> User Overrides
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {testResult.user_overrides.map((override: any, idx: number) => (
                        <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <Badge>{override.override_type}</Badge>
                          <span className="ml-2">{override.reason}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Policy Test</CardTitle>
              <CardDescription>Test if a user can access a workflow and what actions they can perform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">User</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Workflow</label>
                  <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select workflow..." />
                    </SelectTrigger>
                    <SelectContent>
                      {workflows?.map((wf: any) => (
                        <SelectItem key={wf.id} value={wf.id}>
                          {wf.name} {wf.secured_table ? `(${wf.secured_table})` : '(unsecured)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={runWorkflowTest} disabled={testWorkflowPolicy.isPending} className="w-full">
                {testWorkflowPolicy.isPending ? 'Testing...' : 'Run Workflow Policy Test'}
              </Button>
            </CardContent>
          </Card>

          {workflowTestResult && (
            <div className="space-y-4">
              <Alert variant={workflowTestResult.can_see_workflow ? "default" : "destructive"}>
                {workflowTestResult.can_see_workflow ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {workflowTestResult.can_see_workflow ? 'Workflow Accessible' : 'Workflow Not Accessible'}
                </AlertTitle>
                <AlertDescription>
                  {workflowTestResult.reason}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5" /> User Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {workflowTestResult.user?.name}</p>
                      <p><strong>Email:</strong> {workflowTestResult.user?.email}</p>
                      <p>
                        <strong>Admin:</strong>{' '}
                        {workflowTestResult.user?.is_admin ? (
                          <Badge className="bg-green-600">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Workflow className="h-5 w-5" /> Workflow Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Workflow:</strong> {workflowTestResult.workflow?.name}</p>
                      <p><strong>Secured Module:</strong> {workflowTestResult.workflow?.secured_module || 'None'}</p>
                      <p><strong>Secured Table:</strong> {workflowTestResult.workflow?.secured_table || 'None'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" /> Available Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {workflowTestResult.available_actions?.map((action: string) => (
                      <Badge key={action} className="bg-green-600">
                        {action}
                      </Badge>
                    ))}
                    {(!workflowTestResult.available_actions || workflowTestResult.available_actions.length === 0) && (
                      <p className="text-muted-foreground">No actions available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {workflowTestResult.visible_fields?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5" /> Visible Fields
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {workflowTestResult.visible_fields.map((field: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted rounded flex justify-between items-center">
                          <span className="font-mono">{field.field_name}</span>
                          <div className="flex gap-2">
                            <Badge variant={field.can_view ? "default" : "secondary"}>
                              View: {field.can_view ? '✓' : '✗'}
                            </Badge>
                            <Badge variant={field.can_edit ? "default" : "secondary"}>
                              Edit: {field.can_edit ? '✓' : '✗'}
                            </Badge>
                            <Badge variant={field.masking_type === 'none' ? "outline" : "destructive"}>
                              {field.masking_type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {workflowTestResult.scope_rules_applied?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" /> Scope Rules Applied
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {workflowTestResult.scope_rules_applied.map((rule: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted rounded">
                          <span>{JSON.stringify(rule)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
