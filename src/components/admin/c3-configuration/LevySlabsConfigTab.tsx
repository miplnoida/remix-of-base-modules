import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
 import React, { useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Badge } from '@/components/ui/badge';
 import { Plus, Edit, Trash2, Copy, Eye, Layers } from 'lucide-react';
 import { format } from 'date-fns';
 import { useLevySlabs, useDeleteLevySlab, LevySlab } from '@/hooks/useLevySlabsManagement';
 import { LevySlabDialog } from '@/components/admin/levy-slabs/LevySlabDialog';
 import { LevySlabCloneDialog } from '@/components/admin/levy-slabs/LevySlabCloneDialog';
 import { LevySlabDetailsDialog } from '@/components/admin/levy-slabs/LevySlabDetailsDialog';
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
 
 export function LevySlabsConfigTab() {
   const { data: slabs, isLoading } = useLevySlabs();
   const deleteMutation = useDeleteLevySlab();
  const { profile } = useSupabaseAuth();
 
   const [isCreateOpen, setIsCreateOpen] = useState(false);
   const [editingSlab, setEditingSlab] = useState<LevySlab | null>(null);
   const [cloningSlabId, setCloningSlabId] = useState<string | null>(null);
   const [viewingSlabId, setViewingSlabId] = useState<string | null>(null);
  const [deletingSlab, setDeletingSlab] = useState<LevySlab | null>(null);
 
   const handleDelete = async () => {
    if (deletingSlab) {
      await deleteMutation.mutateAsync({
        id: deletingSlab.id,
        slabInfo: { start_date: deletingSlab.start_date, end_date: deletingSlab.end_date },
        userCode: profile?.user_code
      });
      setDeletingSlab(null);
     }
   };
 
   return (
     <>
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <div>
               <CardTitle className="flex items-center gap-2">
                 <Layers className="h-5 w-5" />
                 Levy Slab Periods
               </CardTitle>
               <CardDescription>
                 Configure levy calculation brackets for different time periods
               </CardDescription>
             </div>
             <Button onClick={() => setIsCreateOpen(true)}>
               <Plus className="h-4 w-4 mr-2" />
               New Levy Slab
             </Button>
           </div>
         </CardHeader>
         <CardContent>
           {isLoading ? (
             <div className="text-center py-8 text-muted-foreground">Loading...</div>
           ) : !slabs?.length ? (
             <div className="text-center py-8 text-muted-foreground">
               No levy slabs configured. Create one to get started.
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Start Date</TableHead>
                   <TableHead>End Date</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Created</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {slabs.map((slab) => (
                   <TableRow key={slab.id}>
                     <TableCell className="font-medium">
                       {format(new Date(slab.start_date), 'dd MMM yyyy')}
                     </TableCell>
                     <TableCell>
                       {format(new Date(slab.end_date), 'dd MMM yyyy')}
                     </TableCell>
                     <TableCell>
                       <Badge variant={slab.is_active ? 'default' : 'secondary'}>
                         {slab.is_active ? 'Active' : 'Inactive'}
                       </Badge>
                     </TableCell>
                     <TableCell className="text-muted-foreground">
                       {slab.created_on
                         ? format(new Date(slab.created_on), 'dd MMM yyyy')
                         : '-'}
                     </TableCell>
                     <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => setViewingSlabId(slab.id)}
                         >
                           <Eye className="h-4 w-4" />
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => setEditingSlab(slab)}
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => setCloningSlabId(slab.id)}
                         >
                           <Copy className="h-4 w-4" />
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                          onClick={() => setDeletingSlab(slab)}
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
       <LevySlabDialog
         open={isCreateOpen}
         onOpenChange={setIsCreateOpen}
         slab={null}
       />
 
       {/* Edit Dialog */}
       <LevySlabDialog
         open={!!editingSlab}
         onOpenChange={(open) => !open && setEditingSlab(null)}
         slab={editingSlab}
       />
 
       {/* Clone Dialog */}
       <LevySlabCloneDialog
         open={!!cloningSlabId}
         onOpenChange={(open) => !open && setCloningSlabId(null)}
         sourceSlabId={cloningSlabId}
       />
 
       {/* Details Dialog */}
       <LevySlabDetailsDialog
         open={!!viewingSlabId}
         onOpenChange={(open) => !open && setViewingSlabId(null)}
         slabId={viewingSlabId}
       />
 
       {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSlab} onOpenChange={(open) => !open && setDeletingSlab(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Delete Levy Slab</AlertDialogTitle>
             <AlertDialogDescription>
               This will permanently delete this levy slab and all its details. This action cannot be undone.
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