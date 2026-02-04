import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  useLevySlabWithDetails,
  useDeleteLevySlabDetail,
  LevySlabDetail
} from '@/hooks/useLevySlabsManagement';
import { LevySlabDetailForm } from './LevySlabDetailForm';
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

interface LevySlabDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slabId: string | null;
}

const PAY_PERIOD_LABELS: Record<string, string> = {
  'W': 'Weekly',
  'B': 'Bi-Weekly',
  'S': 'Semi-Monthly',
  'M': 'Monthly'
};

export const LevySlabDetailsDialog: React.FC<LevySlabDetailsDialogProps> = ({
  open,
  onOpenChange,
  slabId
}) => {
  const { data: slabWithDetails, isLoading } = useLevySlabWithDetails(slabId || undefined);
  const deleteDetailMutation = useDeleteLevySlabDetail();

  const [isAddingDetail, setIsAddingDetail] = useState(false);
  const [editingDetail, setEditingDetail] = useState<LevySlabDetail | null>(null);
  const [deletingDetail, setDeletingDetail] = useState<LevySlabDetail | null>(null);

  const handleDeleteDetail = async () => {
    if (deletingDetail && slabId) {
      await deleteDetailMutation.mutateAsync({
        id: deletingDetail.id,
        slabId
      });
      setDeletingDetail(null);
    }
  };

  // Group details by pay period
  const groupedDetails = slabWithDetails?.details.reduce((acc, detail) => {
    const period = detail.pay_period || 'Unknown';
    if (!acc[period]) acc[period] = [];
    acc[period].push(detail);
    return acc;
  }, {} as Record<string, LevySlabDetail[]>) || {};

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Levy Slab Details</DialogTitle>
            <DialogDescription>
              {slabWithDetails && (
                <>
                  Period: {format(new Date(slabWithDetails.start_date), 'dd MMM yyyy')} - {format(new Date(slabWithDetails.end_date), 'dd MMM yyyy')}
                  {' | '}
                  <Badge variant={slabWithDetails.is_active ? 'default' : 'secondary'}>
                    {slabWithDetails.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setIsAddingDetail(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Detail
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !slabWithDetails?.details.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No slab details configured. Add tax brackets for different pay periods.
              </div>
            ) : (
              Object.entries(groupedDetails).map(([period, details]) => (
                <div key={period} className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {PAY_PERIOD_LABELS[period] || period}
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Order</TableHead>
                        <TableHead>Over Amount</TableHead>
                        <TableHead>Base Amount</TableHead>
                        <TableHead>Tax Rate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details
                        .sort((a, b) => (a.order_no || 0) - (b.order_no || 0))
                        .map((detail) => (
                          <TableRow key={detail.id}>
                            <TableCell>{detail.order_no}</TableCell>
                            <TableCell>${(detail.over_amt || 0).toFixed(2)}</TableCell>
                            <TableCell>${(detail.base_amt || 0).toFixed(2)}</TableCell>
                            <TableCell>{((detail.tax_rate || 0) * 100).toFixed(2)}%</TableCell>
                            <TableCell>
                              <Badge variant={detail.is_active ? 'default' : 'secondary'} className="text-xs">
                                {detail.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingDetail(detail)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingDetail(detail)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Detail Form */}
      {slabId && (
        <LevySlabDetailForm
          open={isAddingDetail}
          onOpenChange={setIsAddingDetail}
          slabId={slabId}
          detail={null}
        />
      )}

      {/* Edit Detail Form */}
      {slabId && editingDetail && (
        <LevySlabDetailForm
          open={!!editingDetail}
          onOpenChange={(open) => !open && setEditingDetail(null)}
          slabId={slabId}
          detail={editingDetail}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingDetail} onOpenChange={(open) => !open && setDeletingDetail(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Slab Detail</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this tax bracket. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDetail} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
