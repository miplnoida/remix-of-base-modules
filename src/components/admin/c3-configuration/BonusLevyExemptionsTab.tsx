import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
 import React, { useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Badge } from '@/components/ui/badge';
 import { Plus, Edit, Trash2, Gift } from 'lucide-react';
 import { format } from 'date-fns';
 import {
   useBonusLevyExemptions,
   useDeleteBonusLevyExemption,
   formatPeriod,
   BonusLevyExemption
 } from '@/hooks/useBonusLevyExemptions';
 import { BonusLevyExemptionDialog } from '@/components/admin/bonus-levy/BonusLevyExemptionDialog';
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
 
 export function BonusLevyExemptionsTab() {
   const { data: exemptions, isLoading } = useBonusLevyExemptions();
   const deleteMutation = useDeleteBonusLevyExemption();
  const { profile } = useSupabaseAuth();
 
   const [isCreateOpen, setIsCreateOpen] = useState(false);
   const [editingExemption, setEditingExemption] = useState<BonusLevyExemption | null>(null);
  const [deletingExemption, setDeletingExemption] = useState<BonusLevyExemption | null>(null);
 
   const handleDelete = async () => {
    if (deletingExemption) {
      await deleteMutation.mutateAsync({
        id: deletingExemption.id,
        exemptionInfo: {
          period_year: deletingExemption.period_year,
          period_month: deletingExemption.period_month,
          is_exempt: deletingExemption.is_exempt
        },
        userCode: profile?.user_code
      });
      setDeletingExemption(null);
     }
   };
 
   return (
     <>
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <div>
               <CardTitle className="flex items-center gap-2">
                 <Gift className="h-5 w-5" />
                 Exemption Periods
               </CardTitle>
               <CardDescription>
                 Define specific month-year periods where bonus amounts are exempt from levy calculation
               </CardDescription>
             </div>
             <Button onClick={() => setIsCreateOpen(true)}>
               <Plus className="h-4 w-4 mr-2" />
               Add Exemption Period
             </Button>
           </div>
         </CardHeader>
         <CardContent>
           {isLoading ? (
             <div className="text-center py-8 text-muted-foreground">Loading...</div>
           ) : !exemptions?.length ? (
             <div className="text-center py-8 text-muted-foreground">
               No exemption periods configured. Add one to exempt bonus from levy for specific periods.
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Period</TableHead>
                   <TableHead>Exemption Status</TableHead>
                   <TableHead>Description</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Created</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {exemptions.map((exemption) => (
                   <TableRow key={exemption.id}>
                     <TableCell className="font-medium">
                       {formatPeriod(exemption.period_year, exemption.period_month)}
                     </TableCell>
                     <TableCell>
                       <Badge variant={exemption.is_exempt ? 'default' : 'outline'}>
                         {exemption.is_exempt ? 'Exempt' : 'Not Exempt'}
                       </Badge>
                     </TableCell>
                     <TableCell className="text-muted-foreground max-w-xs truncate">
                       {exemption.description || '-'}
                     </TableCell>
                     <TableCell>
                       <Badge variant={exemption.is_active ? 'default' : 'secondary'}>
                         {exemption.is_active ? 'Active' : 'Inactive'}
                       </Badge>
                     </TableCell>
                     <TableCell className="text-muted-foreground">
                       {exemption.created_on
                         ? format(new Date(exemption.created_on), 'dd MMM yyyy')
                         : '-'}
                     </TableCell>
                     <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => setEditingExemption(exemption)}
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                          onClick={() => setDeletingExemption(exemption)}
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </div>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           )}
         </CardContent>
       </Card>
 
       {/* Create Dialog */}
       <BonusLevyExemptionDialog
         open={isCreateOpen}
         onOpenChange={setIsCreateOpen}
         exemption={null}
       />
 
       {/* Edit Dialog */}
       <BonusLevyExemptionDialog
         open={!!editingExemption}
         onOpenChange={(open) => !open && setEditingExemption(null)}
         exemption={editingExemption}
       />
 
       {/* Delete Confirmation */}
      <AlertDialog open={!!deletingExemption} onOpenChange={(open) => !open && setDeletingExemption(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Delete Exemption Period</AlertDialogTitle>
             <AlertDialogDescription>
               This will permanently delete this bonus levy exemption. This action cannot be undone.
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
     </>
   );
 }