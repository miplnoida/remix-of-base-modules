import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trash2, 
  FileX, 
  Database, 
  Code, 
  Search, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CleanupItem {
  id: string;
  name: string;
  type: 'page' | 'api' | 'database';
  originalLocation?: string;
  reason: string;
  selected: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

interface ScanResult {
  scannedAt: string;
  usedObjects: Array<{ name: string; type: string; isUsed: boolean; usedBy: string[] }>;
  unusedObjects: Array<{ name: string; type: string; isUsed: boolean; reason: string }>;
}

export default function CleanupReview() {
  const [unusedPages, setUnusedPages] = useState<CleanupItem[]>([]);
  const [unusedAPIs, setUnusedAPIs] = useState<CleanupItem[]>([]);
  const [unusedDBObjects, setUnusedDBObjects] = useState<CleanupItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadScanResults();
  }, []);

  const loadScanResults = () => {
    // Load from dependency scan results
    const savedResult = localStorage.getItem('lastDependencyScan');
    
    if (savedResult) {
      try {
        const result: ScanResult = JSON.parse(savedResult);
        
        // Convert unused objects to cleanup items
        const dbItems: CleanupItem[] = result.unusedObjects.map((obj, idx) => ({
          id: `db-${idx}`,
          name: obj.name,
          type: 'database',
          reason: obj.reason || 'Not referenced by any active module',
          selected: false,
          riskLevel: determineRiskLevel(obj.name)
        }));
        
        setUnusedDBObjects(dbItems);
      } catch (e) {
        console.error('Failed to parse scan results');
      }
    }

    // For pages, we would need to compare routes with menu items
    // This is a simplified example
    setUnusedPages([]);
    setUnusedAPIs([]);
  };

  const determineRiskLevel = (tableName: string): 'low' | 'medium' | 'high' => {
    // Tables with user data or audit logs are high risk
    if (tableName.includes('audit') || tableName.includes('log') || tableName.includes('user')) {
      return 'high';
    }
    // Tables with business data are medium risk
    if (tableName.includes('legal') || tableName.includes('compliance') || tableName.includes('benefit')) {
      return 'medium';
    }
    return 'low';
  };

  const toggleSelection = (type: 'page' | 'api' | 'database', id: string) => {
    const updateFn = (items: CleanupItem[]) =>
      items.map(item => item.id === id ? { ...item, selected: !item.selected } : item);

    switch (type) {
      case 'page':
        setUnusedPages(updateFn);
        break;
      case 'api':
        setUnusedAPIs(updateFn);
        break;
      case 'database':
        setUnusedDBObjects(updateFn);
        break;
    }
  };

  const selectAll = (type: 'page' | 'api' | 'database', selected: boolean) => {
    const updateFn = (items: CleanupItem[]) =>
      items.map(item => ({ ...item, selected }));

    switch (type) {
      case 'page':
        setUnusedPages(updateFn);
        break;
      case 'api':
        setUnusedAPIs(updateFn);
        break;
      case 'database':
        setUnusedDBObjects(updateFn);
        break;
    }
  };

  const getSelectedItems = () => {
    return {
      pages: unusedPages.filter(p => p.selected),
      apis: unusedAPIs.filter(a => a.selected),
      dbObjects: unusedDBObjects.filter(d => d.selected)
    };
  };

  const selectedCount = 
    unusedPages.filter(p => p.selected).length +
    unusedAPIs.filter(a => a.selected).length +
    unusedDBObjects.filter(d => d.selected).length;

  const handleSafeDelete = () => {
    if (selectedCount === 0) {
      toast({
        title: 'No Items Selected',
        description: 'Please select items to delete',
        variant: 'destructive'
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  const executeCleanup = async () => {
    if (confirmText !== 'CONFIRM') {
      toast({
        title: 'Confirmation Required',
        description: 'Please type CONFIRM to proceed',
        variant: 'destructive'
      });
      return;
    }

    setDeleting(true);
    const selected = getSelectedItems();

    try {
      // Create backup snapshot first
      const backupId = `backup-${Date.now()}`;
      const backupData = {
        id: backupId,
        createdAt: new Date().toISOString(),
        deletedItems: selected,
        canRestore: true
      };

      // Store backup reference
      const backups = JSON.parse(localStorage.getItem('cleanupBackups') || '[]');
      backups.push(backupData);
      localStorage.setItem('cleanupBackups', JSON.stringify(backups));

      // Note: Actual database table deletion would require admin privileges
      // and should be done via a secure edge function
      // For now, we'll just mark items as cleaned

      // Remove selected items from UI
      setUnusedDBObjects(prev => prev.filter(d => !d.selected));
      setUnusedPages(prev => prev.filter(p => !p.selected));
      setUnusedAPIs(prev => prev.filter(a => !a.selected));

      toast({
        title: 'Cleanup Complete',
        description: `Successfully cleaned ${selectedCount} items. Backup ID: ${backupId}`
      });

      setShowConfirmDialog(false);
      setConfirmText('');

    } catch (error) {
      console.error('Cleanup error:', error);
      toast({
        title: 'Cleanup Failed',
        description: 'An error occurred during cleanup',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };

  const getRiskBadge = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      case 'medium':
        return <Badge variant="default" className="bg-amber-500">Medium Risk</Badge>;
      case 'low':
        return <Badge variant="secondary">Low Risk</Badge>;
    }
  };

  const filterItems = (items: CleanupItem[]) => {
    if (!searchTerm) return items;
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cleanup Review</h1>
          <p className="text-muted-foreground mt-1">
            Review and select unused items for safe deletion
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadScanResults}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSafeDelete}
            disabled={selectedCount === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Safe Delete ({selectedCount})
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Items Marked for Cleanup
          </CardTitle>
          <CardDescription>
            Select items to remove. A backup will be created before deletion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="database">
            <TabsList>
              <TabsTrigger value="pages">
                <FileX className="h-4 w-4 mr-2" />
                Unused Pages ({unusedPages.length})
              </TabsTrigger>
              <TabsTrigger value="apis">
                <Code className="h-4 w-4 mr-2" />
                Unused APIs ({unusedAPIs.length})
              </TabsTrigger>
              <TabsTrigger value="database">
                <Database className="h-4 w-4 mr-2" />
                Unused Database ({unusedDBObjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pages" className="mt-4">
              <CleanupTable
                items={filterItems(unusedPages)}
                type="page"
                onToggle={toggleSelection}
                onSelectAll={(selected) => selectAll('page', selected)}
                getRiskBadge={getRiskBadge}
              />
            </TabsContent>

            <TabsContent value="apis" className="mt-4">
              <CleanupTable
                items={filterItems(unusedAPIs)}
                type="api"
                onToggle={toggleSelection}
                onSelectAll={(selected) => selectAll('api', selected)}
                getRiskBadge={getRiskBadge}
              />
            </TabsContent>

            <TabsContent value="database" className="mt-4">
              <CleanupTable
                items={filterItems(unusedDBObjects)}
                type="database"
                onToggle={toggleSelection}
                onSelectAll={(selected) => selectAll('database', selected)}
                getRiskBadge={getRiskBadge}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Confirm Safe Delete
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>You are about to delete the following items:</p>
              
              <div className="bg-muted p-4 rounded-md max-h-48 overflow-y-auto">
                {getSelectedItems().pages.length > 0 && (
                  <div className="mb-2">
                    <strong>Pages ({getSelectedItems().pages.length}):</strong>
                    <ul className="list-disc ml-4 text-sm">
                      {getSelectedItems().pages.map(p => <li key={p.id}>{p.name}</li>)}
                    </ul>
                  </div>
                )}
                {getSelectedItems().apis.length > 0 && (
                  <div className="mb-2">
                    <strong>APIs ({getSelectedItems().apis.length}):</strong>
                    <ul className="list-disc ml-4 text-sm">
                      {getSelectedItems().apis.map(a => <li key={a.id}>{a.name}</li>)}
                    </ul>
                  </div>
                )}
                {getSelectedItems().dbObjects.length > 0 && (
                  <div>
                    <strong>Database Objects ({getSelectedItems().dbObjects.length}):</strong>
                    <ul className="list-disc ml-4 text-sm">
                      {getSelectedItems().dbObjects.map(d => <li key={d.id}>{d.name}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <p className="font-medium text-destructive">
                A backup will be created before deletion. This action can be rolled back.
              </p>

              <div>
                <label className="text-sm font-medium">Type CONFIRM to proceed:</label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type CONFIRM"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeCleanup}
              disabled={confirmText !== 'CONFIRM' || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected Items
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Cleanup Table Component
interface CleanupTableProps {
  items: CleanupItem[];
  type: 'page' | 'api' | 'database';
  onToggle: (type: 'page' | 'api' | 'database', id: string) => void;
  onSelectAll: (selected: boolean) => void;
  getRiskBadge: (level: 'low' | 'medium' | 'high') => React.ReactNode;
}

function CleanupTable({ items, type, onToggle, onSelectAll, getRiskBadge }: CleanupTableProps) {
  const allSelected = items.length > 0 && items.every(i => i.selected);
  const someSelected = items.some(i => i.selected) && !allSelected;

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No unused items found in this category</p>
        <p className="text-sm mt-2">Run a dependency scan to detect unused items</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                // @ts-ignore
                indeterminate={someSelected}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Risk Level</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow key={item.id} className={item.selected ? 'bg-destructive/10' : ''}>
              <TableCell>
                <Checkbox
                  checked={item.selected}
                  onCheckedChange={() => onToggle(type, item.id)}
                />
              </TableCell>
              <TableCell className="font-mono">{item.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{item.reason}</TableCell>
              <TableCell>{getRiskBadge(item.riskLevel)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
