import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database, 
  Download,
  Upload,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SyncStatus {
  module: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  lastSync: string;
  recordsProcessed: number;
  totalRecords: number;
  errors: number;
}

const SageSynchronization = () => {
  const { toast } = useToast();
  const [isFullSyncRunning, setIsFullSyncRunning] = useState(false);
  
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([
    {
      module: 'Chart of Accounts',
      status: 'completed',
      progress: 100,
      lastSync: '2024-01-15 09:30:00',
      recordsProcessed: 150,
      totalRecords: 150,
      errors: 0
    },
    {
      module: 'Payment Types',
      status: 'completed',
      progress: 100,
      lastSync: '2024-01-15 09:28:00',
      recordsProcessed: 25,
      totalRecords: 25,
      errors: 0
    },
    {
      module: 'Bank Accounts',
      status: 'failed',
      progress: 60,
      lastSync: '2024-01-15 08:45:00',
      recordsProcessed: 12,
      totalRecords: 20,
      errors: 3
    },
    {
      module: 'Transactions',
      status: 'pending',
      progress: 0,
      lastSync: '2024-01-14 16:30:00',
      recordsProcessed: 0,
      totalRecords: 1250,
      errors: 0
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleFullSync = () => {
    setIsFullSyncRunning(true);
    toast({
      title: "Full Synchronization Started",
      description: "Complete synchronization with Sage has been initiated.",
    });
    
    // Simulate sync process
    setTimeout(() => {
      setIsFullSyncRunning(false);
      toast({
        title: "Synchronization Complete",
        description: "All modules have been synchronized successfully.",
      });
    }, 5000);
  };

  const handleModuleSync = (module: string) => {
    setSyncStatuses(prev => 
      prev.map(item => 
        item.module === module 
          ? { ...item, status: 'running', progress: 0 }
          : item
      )
    );
    
    toast({
      title: "Module Sync Started",
      description: `Synchronization for ${module} has been initiated.`,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sage Synchronization</h1>
          <p className="text-muted-foreground">Monitor and manage data synchronization with Sage</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Sync Settings
          </Button>
          <Button 
            onClick={handleFullSync} 
            disabled={isFullSyncRunning}
          >
            {isFullSyncRunning ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Full Sync
          </Button>
        </div>
      </div>

      <Tabs defaultValue="status" className="space-y-4">
        <TabsList>
          <TabsTrigger value="status">Sync Status</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
          <TabsTrigger value="settings">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <div className="grid gap-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Last successful full synchronization: January 14, 2024 at 4:30 PM
              </AlertDescription>
            </Alert>

            {syncStatuses.map((sync) => (
              <Card key={sync.module}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(sync.status)}
                      <CardTitle className="text-lg">{sync.module}</CardTitle>
                      {getStatusBadge(sync.status)}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleModuleSync(sync.module)}
                      disabled={sync.status === 'running'}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Now
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progress: {sync.recordsProcessed}/{sync.totalRecords} records</span>
                    <span>Last sync: {sync.lastSync}</span>
                  </div>
                  <Progress value={sync.progress} className="h-2" />
                  {sync.errors > 0 && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <XCircle className="h-4 w-4" />
                      <span>{sync.errors} errors encountered</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization History</CardTitle>
              <CardDescription>
                Recent synchronization activities and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { time: '2024-01-15 09:30:00', module: 'Chart of Accounts', status: 'Success', records: 150 },
                  { time: '2024-01-15 09:28:00', module: 'Payment Types', status: 'Success', records: 25 },
                  { time: '2024-01-15 08:45:00', module: 'Bank Accounts', status: 'Failed', records: 12 },
                  { time: '2024-01-14 16:30:00', module: 'Full Sync', status: 'Success', records: 2450 },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      {item.status === 'Success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <div className="font-medium">{item.module}</div>
                        <div className="text-sm text-muted-foreground">{item.time}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{item.records} records</div>
                      <Badge variant={item.status === 'Success' ? 'default' : 'destructive'}>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Connection Settings</CardTitle>
                <CardDescription>Configure Sage connection parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Sage Server Connection</div>
                    <div className="text-sm text-muted-foreground">Status: Connected</div>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Auto Sync</div>
                    <div className="text-sm text-muted-foreground">Runs every 4 hours</div>
                  </div>
                  <Badge variant="secondary">Enabled</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Export/Import</CardTitle>
                <CardDescription>Manual data transfer options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export to Sage
                  </Button>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import from Sage
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SageSynchronization;