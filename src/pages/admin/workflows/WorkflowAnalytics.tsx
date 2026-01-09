import { 
  BarChart3, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  Activity
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { MODULE_NAMES } from '@/hooks/useActionPermission';
import { useWorkflowAnalytics, useWorkflowDefinitions } from '@/hooks/useWorkflows';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function WorkflowAnalytics() {
  const { data: analytics, isLoading: analyticsLoading } = useWorkflowAnalytics();
  const { data: workflows } = useWorkflowDefinitions();

  // Get workflow instances grouped by workflow
  const { data: instancesByWorkflow } = useQuery({
    queryKey: ['instances-by-workflow'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_instances')
        .select('workflow_name, status');
      
      if (error) throw error;
      
      // Group by workflow
      const grouped: Record<string, { name: string; total: number; completed: number; pending: number }> = {};
      
      data?.forEach(instance => {
        if (!grouped[instance.workflow_name]) {
          grouped[instance.workflow_name] = {
            name: instance.workflow_name,
            total: 0,
            completed: 0,
            pending: 0,
          };
        }
        grouped[instance.workflow_name].total++;
        if (instance.status === 'Completed') {
          grouped[instance.workflow_name].completed++;
        } else if (instance.status === 'Pending' || instance.status === 'InProgress') {
          grouped[instance.workflow_name].pending++;
        }
      });
      
      return Object.values(grouped);
    },
  });

  const statusData = analytics ? [
    { name: 'Pending', value: analytics.pending, color: '#FFBB28' },
    { name: 'Completed', value: analytics.completed, color: '#00C49F' },
    { name: 'Rejected', value: analytics.rejected, color: '#FF8042' },
  ].filter(d => d.value > 0) : [];

  return (
    <PermissionWrapper moduleName={MODULE_NAMES.WORKFLOW_ANALYTICS}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Workflow Analytics</h1>
          <p className="text-muted-foreground">Monitor workflow performance and metrics</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{analytics?.total || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {workflows?.filter(w => w.is_active).length || 0} active definitions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{analytics?.pending || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Awaiting action
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{analytics?.completed || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Successfully processed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SLA Violations</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-red-500">{analytics?.slaViolations || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Past due date
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{analytics?.rejected || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Workflows rejected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{analytics?.avgCompletionTimeHours || 0}h</div>
              )}
              <p className="text-xs text-muted-foreground">
                Average time to complete
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflows by Status</CardTitle>
              <CardDescription>Distribution of workflow instances by status</CardDescription>
            </CardHeader>
            <CardContent>
              {statusData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workflow Performance</CardTitle>
              <CardDescription>Instances by workflow definition</CardDescription>
            </CardHeader>
            <CardContent>
              {!instancesByWorkflow || instancesByWorkflow.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={instancesByWorkflow}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" name="Completed" fill="#00C49F" />
                    <Bar dataKey="pending" name="Pending" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionWrapper>
  );
}
