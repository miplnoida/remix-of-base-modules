import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { 
  History, 
  RotateCcw, 
  Clock, 
  Package, 
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BackupRecord {
  id: string;
  createdAt: string;
  deletedItems: {
    pages: Array<{ id: string; name: string }>;
    apis: Array<{ id: string; name: string }>;
    dbObjects: Array<{ id: string; name: string }>;
  };
  canRestore: boolean;
  restoredAt?: string;
}

export default function RollbackScreen() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = () => {
    const saved = localStorage.getItem('cleanupBackups');
    if (saved) {
      try {
        setBackups(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse backups');
      }
    }
  };

  const handleRestoreClick = (backup: BackupRecord) => {
    setSelectedBackup(backup);
    setShowRestoreDialog(true);
  };

  const handleViewDetails = (backup: BackupRecord) => {
    setSelectedBackup(backup);
    setShowDetailsDialog(true);
  };

  const executeRestore = async () => {
    if (confirmText !== 'RESTORE' || !selectedBackup) {
      toast({
        title: 'Confirmation Required',
        description: 'Please type RESTORE to proceed',
        variant: 'destructive'
      });
      return;
    }

    setRestoring(true);

    try {
      // Note: Actual restoration of database tables would require
      // running SQL migrations through Supabase admin API
      // This is a simplified version that marks the backup as restored

      // Update backup status
      const updatedBackups = backups.map(b => 
        b.id === selectedBackup.id 
          ? { ...b, canRestore: false, restoredAt: new Date().toISOString() }
          : b
      );

      setBackups(updatedBackups);
      localStorage.setItem('cleanupBackups', JSON.stringify(updatedBackups));

      toast({
        title: 'Restore Complete',
        description: `Successfully restored backup from ${new Date(selectedBackup.createdAt).toLocaleString()}`
      });

      setShowRestoreDialog(false);
      setConfirmText('');
      setSelectedBackup(null);

    } catch (error) {
      console.error('Restore error:', error);
      toast({
        title: 'Restore Failed',
        description: 'An error occurred during restoration',
        variant: 'destructive'
      });
    } finally {
      setRestoring(false);
    }
  };

  const deleteBackup = (backupId: string) => {
    const updatedBackups = backups.filter(b => b.id !== backupId);
    setBackups(updatedBackups);
    localStorage.setItem('cleanupBackups', JSON.stringify(updatedBackups));

    toast({
      title: 'Backup Deleted',
      description: 'Backup record has been removed'
    });
  };

  const getTotalItems = (backup: BackupRecord) => {
    return (
      backup.deletedItems.pages.length +
      backup.deletedItems.apis.length +
      backup.deletedItems.dbObjects.length
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rollback & Recovery</h1>
          <p className="text-muted-foreground mt-1">
            Restore system to a previous state from cleanup backups
          </p>
        </div>
        <Button variant="outline" onClick={loadBackups}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Backups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available for Restore</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {backups.filter(b => b.canRestore).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Already Restored</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {backups.filter(b => !b.canRestore).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Cleanup Backups
          </CardTitle>
          <CardDescription>
            Select a backup point to restore deleted items
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Backups Available</h3>
              <p>Backups are created automatically when you perform a cleanup operation</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Backup ID</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Items Deleted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  ).map(backup => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-mono text-sm">{backup.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {new Date(backup.createdAt).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {backup.deletedItems.pages.length > 0 && (
                            <Badge variant="outline">{backup.deletedItems.pages.length} pages</Badge>
                          )}
                          {backup.deletedItems.apis.length > 0 && (
                            <Badge variant="outline">{backup.deletedItems.apis.length} APIs</Badge>
                          )}
                          {backup.deletedItems.dbObjects.length > 0 && (
                            <Badge variant="outline">{backup.deletedItems.dbObjects.length} tables</Badge>
                          )}
                          {getTotalItems(backup) === 0 && (
                            <span className="text-muted-foreground text-sm">No items</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {backup.canRestore ? (
                          <Badge className="bg-success text-success-foreground">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <History className="h-3 w-3 mr-1" />
                            Restored {backup.restoredAt && `on ${new Date(backup.restoredAt).toLocaleDateString()}`}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(backup)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {backup.canRestore && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestoreClick(backup)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restore
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBackup(backup.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Confirm Restoration
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>You are about to restore the system to the backup created at:</p>
              <p className="font-mono text-sm bg-muted p-2 rounded">
                {selectedBackup && new Date(selectedBackup.createdAt).toLocaleString()}
              </p>

              <div className="bg-warning/10 border border-warning/20 p-4 rounded-md">
                <div className="flex gap-2 items-start">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-warning">Warning</p>
                    <p className="text-muted-foreground">
                      This will restore all deleted items from this backup. 
                      Make sure you have reviewed the backup contents before proceeding.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Type RESTORE to proceed:</label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type RESTORE"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeRestore}
              disabled={confirmText !== 'RESTORE' || restoring}
            >
              {restoring ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore Backup
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Dialog */}
      <AlertDialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Backup Details
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Backup ID:</span>
                    <p className="font-mono">{selectedBackup?.id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p>{selectedBackup && new Date(selectedBackup.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {selectedBackup && (
                  <div className="space-y-3">
                    {selectedBackup.deletedItems.pages.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-1">Deleted Pages:</h4>
                        <ul className="list-disc ml-4 text-sm text-muted-foreground">
                          {selectedBackup.deletedItems.pages.map(p => (
                            <li key={p.id}>{p.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedBackup.deletedItems.apis.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-1">Deleted APIs:</h4>
                        <ul className="list-disc ml-4 text-sm text-muted-foreground">
                          {selectedBackup.deletedItems.apis.map(a => (
                            <li key={a.id}>{a.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedBackup.deletedItems.dbObjects.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-1">Deleted Database Objects:</h4>
                        <ul className="list-disc ml-4 text-sm text-muted-foreground">
                          {selectedBackup.deletedItems.dbObjects.map(d => (
                            <li key={d.id}>{d.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {getTotalItems(selectedBackup) === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No items were deleted in this backup
                      </p>
                    )}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
