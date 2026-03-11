import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, Plus, FileText, ShieldCheck, ArrowLeftRight } from 'lucide-react';
import type { DocConfig } from '@/hooks/useDocumentConfiguration';

interface Props {
  documents: DocConfig[];
  onAdd: () => void;
  onEdit: (doc: DocConfig) => void;
  onDelete: (doc: DocConfig) => void;
  onToggleActive: (doc: DocConfig) => void;
}

export default function DocumentList({ documents, onAdd, onEdit, onDelete, onToggleActive }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Documents ({documents.length})</h4>
        <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Document
        </Button>
      </div>
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No documents configured yet. Click "Add Document" to start.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Extensions</TableHead>
              <TableHead>Max Size</TableHead>
              <TableHead>Rules</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map(doc => (
              <TableRow key={doc.id} className={!doc.is_active ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{doc.document_name}</TableCell>
                <TableCell>
                  <Badge variant={doc.is_required ? 'destructive' : 'secondary'} className="text-xs">
                    {doc.is_required ? 'Required' : 'Optional'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {doc.allowed_extensions?.slice(0, 4).map(ext => (
                      <Badge key={ext} variant="outline" className="text-xs">.{ext}</Badge>
                    ))}
                    {(doc.allowed_extensions?.length || 0) > 4 && (
                      <Badge variant="outline" className="text-xs">+{doc.allowed_extensions.length - 4}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{doc.max_file_size_mb} MB</TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    {doc.requires_supportive_doc && (
                      <Badge variant="outline" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" />Support</Badge>
                    )}
                    {doc.allow_alternate_doc && (
                      <Badge variant="outline" className="text-xs gap-1"><ArrowLeftRight className="h-3 w-3" />Alt</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch checked={doc.is_active} onCheckedChange={() => onToggleActive(doc)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(doc)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(doc)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
