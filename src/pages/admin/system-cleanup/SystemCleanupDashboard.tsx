import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, 
  Search, 
  Trash2, 
  RotateCcw, 
  CheckCircle,
  ArrowRight,
  Shield,
  Database,
  FileCode,
  AlertTriangle
} from 'lucide-react';

export default function SystemCleanupDashboard() {
  const navigate = useNavigate();

  const steps = [
    {
      number: 1,
      title: 'Active Modules Inventory',
      description: 'Review all modules currently in use based on database and menu configuration',
      icon: Layers,
      route: '/admin/system-cleanup/modules-inventory',
      status: 'ready'
    },
    {
      number: 2,
      title: 'Dependency Scan',
      description: 'Scan database to identify used and unused tables, views, and functions',
      icon: Search,
      route: '/admin/system-cleanup/dependency-scan',
      status: 'ready'
    },
    {
      number: 3,
      title: 'Cleanup Review',
      description: 'Review unused pages, APIs, and database objects marked for removal',
      icon: Trash2,
      route: '/admin/system-cleanup/cleanup-review',
      status: 'ready'
    },
    {
      number: 4,
      title: 'Rollback & Recovery',
      description: 'Restore system to a previous state from cleanup backups',
      icon: RotateCcw,
      route: '/admin/system-cleanup/rollback',
      status: 'ready'
    }
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Cleanup & Refactoring</h1>
          <p className="text-muted-foreground mt-1">
            Safely clean up unused modules, pages, and database objects
          </p>
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-start">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">Important Safety Notes</h3>
              <ul className="mt-2 text-sm text-amber-700 dark:text-amber-300 list-disc ml-4 space-y-1">
                <li>Always run the Dependency Scan before reviewing items for cleanup</li>
                <li>A backup snapshot is automatically created before any deletion</li>
                <li>Core system tables (users, roles, permissions, workflows) are protected</li>
                <li>You can rollback any cleanup operation using the Rollback screen</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {steps.map((step) => (
          <Card key={step.number} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(step.route)}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-muted-foreground">Step {step.number}:</span>
                    {step.title}
                  </CardTitle>
                  <CardDescription className="mt-1">{step.description}</CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Process Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Cleanup Process Overview
          </CardTitle>
          <CardDescription>
            Follow these steps to safely clean up your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary font-medium">
                <Database className="h-5 w-5" />
                What Gets Scanned
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                <li>• Database tables and views</li>
                <li>• Workflow definitions</li>
                <li>• Data access policies</li>
                <li>• Module configurations</li>
                <li>• Notification templates</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle className="h-5 w-5" />
                Protected Items
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                <li>• User profiles and roles</li>
                <li>• Permission configurations</li>
                <li>• Audit logs</li>
                <li>• Active workflows</li>
                <li>• System configurations</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-600 font-medium">
                <FileCode className="h-5 w-5" />
                Cleanup Targets
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                <li>• Orphaned database tables</li>
                <li>• Unused module entries</li>
                <li>• Deprecated API endpoints</li>
                <li>• Legacy page routes</li>
                <li>• Obsolete configurations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex justify-center gap-4">
        <Button size="lg" onClick={() => navigate('/admin/system-cleanup/modules-inventory')}>
          <Layers className="h-5 w-5 mr-2" />
          Start with Module Inventory
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate('/admin/system-cleanup/dependency-scan')}>
          <Search className="h-5 w-5 mr-2" />
          Run Dependency Scan
        </Button>
      </div>
    </div>
  );
}
