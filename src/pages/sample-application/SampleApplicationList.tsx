import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSampleApplications, useDeleteSampleApplication } from '@/hooks/useSampleApplications';
import { format } from 'date-fns';

export default function SampleApplicationList() {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: applications, isLoading } = useSampleApplications();
  const deleteApplication = useDeleteSampleApplication();

  const handleDelete = async () => {
    if (deleteId) {
      await deleteApplication.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
      case 'Submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'UnderReview':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'MoreInfoRequested':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      case 'Approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'Rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return '';
    }
  };

  const canEdit = (status: string) => status === 'Draft' || status === 'MoreInfoRequested';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sample Applications</h1>
          <p className="text-muted-foreground">View and manage your applications</p>
        </div>
        <Button onClick={() => navigate('/sample-applications/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : applications?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No applications found. Create your first application!
                </TableCell>
              </TableRow>
            ) : (
              applications?.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.title}</TableCell>
                  <TableCell>${app.amount?.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(app.status)}>
                      {app.status === 'MoreInfoRequested' ? 'More Info Requested' : app.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {app.submitted_at ? format(new Date(app.submitted_at), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(app.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/sample-applications/${app.id}`)}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit(app.status) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/sample-applications/${app.id}/edit`)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {app.status === 'Draft' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(app.id)}
                              title="Delete"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this application? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
