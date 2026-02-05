 import React, { useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { History, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
 import { format } from 'date-fns';
import { useC3ConfigAuditLogs, C3AuditLog, getConfigTypeLabel } from '@/hooks/useC3ConfigAuditLogs';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { ScrollArea } from '@/components/ui/scroll-area';
 
 export function C3AuditLogsTab() {
   const { data: auditLogs, isLoading } = useC3ConfigAuditLogs(200);
   const [selectedLog, setSelectedLog] = useState<C3AuditLog | null>(null);
   const [currentPage, setCurrentPage] = useState(1);
   const itemsPerPage = 15;
 
   const totalPages = Math.ceil((auditLogs?.length || 0) / itemsPerPage);
   const paginatedLogs = auditLogs?.slice(
     (currentPage - 1) * itemsPerPage,
     currentPage * itemsPerPage
   );
 
  const getConfigTypeBadge = (configType: string) => {
    switch (configType) {
       case 'period_config':
         return <Badge variant="default">Period Config</Badge>;
      case 'levy_slab':
        return <Badge variant="secondary">Levy Slab</Badge>;
      case 'levy_slab_detail':
        return <Badge variant="outline">Levy Slab Detail</Badge>;
      case 'bonus_exemption':
        return <Badge className="bg-accent text-accent-foreground">Bonus Exemption</Badge>;
       default:
        return <Badge variant="outline">{configType}</Badge>;
     }
   };
 
   const getActionBadge = (action: string) => {
     switch (action.toUpperCase()) {
       case 'CREATE':
         return <Badge className="bg-primary/10 text-primary">Create</Badge>;
       case 'UPDATE':
         return <Badge variant="outline">Update</Badge>;
       case 'DELETE':
         return <Badge variant="destructive">Delete</Badge>;
       case 'CLONE':
         return <Badge className="bg-accent text-accent-foreground">Clone</Badge>;
       default:
         return <Badge variant="outline">{action}</Badge>;
     }
   };
 
   const formatDateTime = (dateStr: string) => {
     return format(new Date(dateStr), 'dd MMM yyyy HH:mm:ss');
   };
 
   const truncateValue = (value: string | null, maxLength: number = 50) => {
     if (!value) return '-';
     if (value.length <= maxLength) return value;
     return value.substring(0, maxLength) + '...';
   };
 
   return (
     <>
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <History className="h-5 w-5" />
             Configuration Audit Logs
           </CardTitle>
           <CardDescription>
             Track all changes made to C3 configuration settings including who made changes, when, and what was modified
           </CardDescription>
         </CardHeader>
         <CardContent>
           {isLoading ? (
             <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
           ) : !auditLogs?.length ? (
             <div className="text-center py-8 text-muted-foreground">
               No audit logs found. Changes to configurations will be tracked here.
             </div>
           ) : (
             <>
               <div className="overflow-x-auto">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Date & Time</TableHead>
                       <TableHead>Source</TableHead>
                       <TableHead>Action</TableHead>
                       <TableHead>Config Key</TableHead>
                       <TableHead>Changed By</TableHead>
                       <TableHead>Old Value</TableHead>
                       <TableHead>New Value</TableHead>
                       <TableHead className="text-right">Details</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {paginatedLogs?.map((log) => (
                       <TableRow key={log.id}>
                         <TableCell className="font-medium whitespace-nowrap">
                           {formatDateTime(log.changed_at)}
                         </TableCell>
                         <TableCell>{getConfigTypeBadge(log.config_type)}</TableCell>
                         <TableCell>{getActionBadge(log.action)}</TableCell>
                         <TableCell className="max-w-[150px] truncate">
                           {log.entity_name || '-'}
                           {log.field_name && (
                             <span className="block text-xs text-muted-foreground">
                               Field: {log.field_name}
                             </span>
                           )}
                         </TableCell>
                         <TableCell>
                           {log.changed_by_name || log.changed_by || '-'}
                         </TableCell>
                         <TableCell className="max-w-[120px] truncate text-muted-foreground">
                           {truncateValue(log.old_value, 30)}
                         </TableCell>
                         <TableCell className="max-w-[120px] truncate">
                           {truncateValue(log.new_value, 30)}
                         </TableCell>
                         <TableCell className="text-right">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => setSelectedLog(log)}
                           >
                             <Eye className="h-4 w-4" />
                           </Button>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
 
               {/* Pagination */}
               {totalPages > 1 && (
                 <div className="flex items-center justify-between mt-4">
                   <p className="text-sm text-muted-foreground">
                     Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                     {Math.min(currentPage * itemsPerPage, auditLogs.length)} of {auditLogs.length} entries
                   </p>
                   <div className="flex items-center gap-2">
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                       disabled={currentPage === 1}
                     >
                       <ChevronLeft className="h-4 w-4" />
                     </Button>
                     <span className="text-sm">
                       Page {currentPage} of {totalPages}
                     </span>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                       disabled={currentPage === totalPages}
                     >
                       <ChevronRight className="h-4 w-4" />
                     </Button>
                   </div>
                 </div>
               )}
             </>
           )}
         </CardContent>
       </Card>
 
       {/* Details Dialog */}
       <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <History className="h-5 w-5" />
               Audit Log Details
             </DialogTitle>
             <DialogDescription>
               Complete details of this configuration change
             </DialogDescription>
           </DialogHeader>
 
           {selectedLog && (
             <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                   <p className="mt-1">{formatDateTime(selectedLog.changed_at)}</p>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-muted-foreground">Changed By</label>
                   <p className="mt-1">{selectedLog.changed_by_name || selectedLog.changed_by || '-'}</p>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-muted-foreground">Config Type</label>
                   <div className="mt-1">{getConfigTypeBadge(selectedLog.config_type)}</div>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-muted-foreground">Action</label>
                   <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                 </div>
                 <div className="col-span-2">
                   <label className="text-sm font-medium text-muted-foreground">Entity Name</label>
                   <p className="mt-1">{selectedLog.entity_name || '-'}</p>
                 </div>
                 {selectedLog.field_name && (
                   <div className="col-span-2">
                     <label className="text-sm font-medium text-muted-foreground">Field Changed</label>
                     <p className="mt-1">{selectedLog.field_name}</p>
                   </div>
                 )}
                 {selectedLog.reason && (
                   <div className="col-span-2">
                     <label className="text-sm font-medium text-muted-foreground">Reason</label>
                     <p className="mt-1">{selectedLog.reason}</p>
                   </div>
                 )}
               </div>
 
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium text-muted-foreground">Old Value</label>
                   <ScrollArea className="h-[200px] mt-1 rounded-md border p-3 bg-muted/30">
                     <pre className="text-sm whitespace-pre-wrap break-words">
                       {selectedLog.old_value || 'N/A'}
                     </pre>
                   </ScrollArea>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-muted-foreground">New Value</label>
                   <ScrollArea className="h-[200px] mt-1 rounded-md border p-3 bg-muted/30">
                     <pre className="text-sm whitespace-pre-wrap break-words">
                       {selectedLog.new_value || 'N/A'}
                     </pre>
                   </ScrollArea>
                 </div>
               </div>
             </div>
           )}
         </DialogContent>
       </Dialog>
     </>
   );
 }