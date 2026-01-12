import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Database, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Clock,
  Table2,
  Code,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DatabaseObject {
  name: string;
  type: 'table' | 'view' | 'function';
  isUsed: boolean;
  usedBy: string[];
  reason?: string;
}

interface ScanResult {
  scannedAt: string;
  usedObjects: DatabaseObject[];
  unusedObjects: DatabaseObject[];
  summary: {
    totalTables: number;
    usedTables: number;
    unusedTables: number;
    totalViews: number;
    usedViews: number;
    unusedViews: number;
    totalFunctions: number;
    usedFunctions: number;
    unusedFunctions: number;
  };
}

// Core tables that are always considered in use
const CORE_TABLES = [
  'profiles', 'user_roles', 'roles', 'role_permissions', 'user_permission_overrides',
  'app_modules', 'module_actions', 'module_tables',
  'audit_logs', 'system_audit_trail', 'system_error_logs', 'system_technical_logs',
  'system_business_events', 'system_security_logs', 'system_integration_logs',
  'system_performance_metrics',
  'workflow_definitions', 'workflow_steps', 'workflow_step_actions', 'workflow_instances',
  'workflow_tasks', 'workflow_logs', 'workflow_execution_logs', 'workflow_triggers',
  'workflow_action_notifications', 'workflow_security_audit_log',
  'notification_templates', 'notification_logs', 'notification_providers',
  'in_app_notifications', 'user_notification_preferences',
  'data_scope_rules', 'field_security_rules', 'user_data_overrides', 'data_policy_audit_log',
  'office_locations', 'office_departments', 'departments', 'designations', 'designation_hierarchy',
  'role_hierarchy', 'password_policies', 'password_history', 'mfa_config', 'user_sessions'
];

// Tables used by specific modules
const MODULE_TABLES: Record<string, string[]> = {
  'sample_applications': ['sample_applications'],
  'legal': [
    'legal_cases', 'legal_documents', 'legal_hearings', 'legal_orders', 'legal_parties',
    'legal_penalties', 'legal_settlements', 'legal_tasks', 'legal_templates',
    'legal_timeline_events', 'legal_audit_log', 'legal_admin_audit', 'legal_code_sets',
    'legal_complainant_settings', 'legal_document_saved_searches', 'legal_document_shares',
    'legal_integrations', 'legal_saved_views', 'legal_sla_rules', 'legal_status_transitions'
  ],
  'compliance': [
    'compliance_registrations', 'compliance_arrears', 'compliance_audits',
    'compliance_payment_plans', 'compliance_waivers', 'compliance_activity_log',
    'inspector_zones', 'inspector_assignments', 'inspector_activities', 'inspector_weekly_plans',
    'audit_interviews'
  ],
  'bema': [
    'bema_registrations', 'bema_arrears_ledger', 'bema_audit_cases', 'bema_c3_submissions',
    'bema_c3_line_items', 'bema_contributors', 'bema_employee_interviews', 'bema_field_activities',
    'bema_inspector_assignments', 'bema_installments', 'bema_payment_plans',
    'bema_remittance_calendar', 'bema_vouchers', 'bema_waivers', 'bema_weekly_plans',
    'bema_zones', 'bema_activity_log'
  ],
  'c3': [
    'c3_submissions', 'c3_line_items'
  ],
  'contributions': [
    'contributor_profiles', 'contribution_vouchers', 'remittance_schedule',
    'payment_plan_installments'
  ]
};

export default function DependencyScan() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const { toast } = useToast();

  const runDependencyScan = async () => {
    setScanning(true);
    setProgress(0);
    setScanResult(null);

    try {
      // Step 1: Get all tables
      setCurrentStep('Fetching database tables...');
      setProgress(10);

      const { data: tablesData } = await supabase.rpc('get_all_public_tables');
      const allTables = (tablesData || []).map((t: { table_name: string }) => t.table_name);

      // Step 2: Get all enabled modules
      setCurrentStep('Analyzing active modules...');
      setProgress(30);

      const { data: modulesData } = await supabase
        .from('app_modules')
        .select('name, is_enabled')
        .eq('is_enabled', true);

      const activeModuleNames = (modulesData || []).map(m => m.name);

      // Step 3: Determine which tables are used
      setCurrentStep('Mapping table dependencies...');
      setProgress(50);

      const usedTables = new Set<string>(CORE_TABLES);
      const tableUsageMap = new Map<string, string[]>();

      // Add core tables with their usage
      CORE_TABLES.forEach(table => {
        tableUsageMap.set(table, ['Core System']);
      });

      // Check module-specific tables
      Object.entries(MODULE_TABLES).forEach(([moduleName, tables]) => {
        tables.forEach(table => {
          usedTables.add(table);
          const existing = tableUsageMap.get(table) || [];
          existing.push(`Module: ${moduleName}`);
          tableUsageMap.set(table, existing);
        });
      });

      // Step 4: Check workflows for table references
      setCurrentStep('Scanning workflow definitions...');
      setProgress(70);

      const { data: workflows } = await supabase
        .from('workflow_definitions')
        .select('name, secured_table');

      (workflows || []).forEach(wf => {
        if (wf.secured_table) {
          usedTables.add(wf.secured_table);
          const existing = tableUsageMap.get(wf.secured_table) || [];
          existing.push(`Workflow: ${wf.name}`);
          tableUsageMap.set(wf.secured_table, existing);
        }
      });

      // Step 5: Check data scope rules
      setCurrentStep('Analyzing data access policies...');
      setProgress(85);

      const { data: scopeRules } = await supabase
        .from('data_scope_rules')
        .select('target_table');

      (scopeRules || []).forEach(rule => {
        if (rule.target_table) {
          usedTables.add(rule.target_table);
          const existing = tableUsageMap.get(rule.target_table) || [];
          existing.push('Data Scope Rule');
          tableUsageMap.set(rule.target_table, existing);
        }
      });

      // Step 6: Categorize tables
      setCurrentStep('Generating scan report...');
      setProgress(95);

      const usedObjects: DatabaseObject[] = [];
      const unusedObjects: DatabaseObject[] = [];

      allTables.forEach(tableName => {
        if (usedTables.has(tableName)) {
          usedObjects.push({
            name: tableName,
            type: 'table',
            isUsed: true,
            usedBy: tableUsageMap.get(tableName) || ['Unknown']
          });
        } else {
          unusedObjects.push({
            name: tableName,
            type: 'table',
            isUsed: false,
            usedBy: [],
            reason: 'Not referenced by any active module, workflow, or data policy'
          });
        }
      });

      const result: ScanResult = {
        scannedAt: new Date().toISOString(),
        usedObjects,
        unusedObjects,
        summary: {
          totalTables: allTables.length,
          usedTables: usedObjects.filter(o => o.type === 'table').length,
          unusedTables: unusedObjects.filter(o => o.type === 'table').length,
          totalViews: 0,
          usedViews: 0,
          unusedViews: 0,
          totalFunctions: 0,
          usedFunctions: 0,
          unusedFunctions: 0
        }
      };

      setScanResult(result);
      setProgress(100);

      // Store scan result in localStorage for other screens
      localStorage.setItem('lastDependencyScan', JSON.stringify(result));

      toast({
        title: 'Scan Complete',
        description: `Found ${result.summary.usedTables} used and ${result.summary.unusedTables} unused tables`
      });

    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: 'Scan Failed',
        description: 'Failed to complete dependency scan',
        variant: 'destructive'
      });
    } finally {
      setScanning(false);
      setCurrentStep('');
    }
  };

  // Load previous scan result on mount
  useEffect(() => {
    const savedResult = localStorage.getItem('lastDependencyScan');
    if (savedResult) {
      try {
        setScanResult(JSON.parse(savedResult));
      } catch (e) {
        console.error('Failed to parse saved scan result');
      }
    }
  }, []);

  const exportScanResult = () => {
    if (!scanResult) return;

    const blob = new Blob([JSON.stringify(scanResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dependency-scan-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Scan results exported successfully'
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dependency Scan</h1>
          <p className="text-muted-foreground mt-1">
            Analyze database objects to identify used and unused items
          </p>
        </div>
        <div className="flex gap-2">
          {scanResult && (
            <Button variant="outline" onClick={exportScanResult}>
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          )}
          <Button onClick={runDependencyScan} disabled={scanning}>
            {scanning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Scan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Scan Progress */}
      {scanning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 animate-pulse text-primary" />
                <span className="text-sm">{currentStep}</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {scanResult && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scanResult.summary.totalTables}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Used Tables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{scanResult.summary.usedTables}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unused Tables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{scanResult.summary.unusedTables}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Last Scanned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {new Date(scanResult.scannedAt).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Scan Results
              </CardTitle>
              <CardDescription>
                Database objects categorized by usage status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="used">
                <TabsList>
                  <TabsTrigger value="used">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Used ({scanResult.usedObjects.length})
                  </TabsTrigger>
                  <TabsTrigger value="unused">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Unused ({scanResult.unusedObjects.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="used" className="mt-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Object Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Used By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanResult.usedObjects.map(obj => (
                          <TableRow key={obj.name}>
                            <TableCell className="font-mono">{obj.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                <Table2 className="h-3 w-3 mr-1" />
                                {obj.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {obj.usedBy.map((usage, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {usage}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="unused" className="mt-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Object Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanResult.unusedObjects.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              No unused objects found
                            </TableCell>
                          </TableRow>
                        ) : (
                          scanResult.unusedObjects.map(obj => (
                            <TableRow key={obj.name}>
                              <TableCell className="font-mono">{obj.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  <Table2 className="h-3 w-3 mr-1" />
                                  {obj.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {obj.reason}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {!scanResult && !scanning && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Scan Results</h3>
              <p className="mb-4">Run a dependency scan to analyze database object usage</p>
              <Button onClick={runDependencyScan}>
                <Play className="h-4 w-4 mr-2" />
                Start Scan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
