import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, ShieldCheck, ArrowLeftRight, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useChildDocs, useChildDocMutations } from '@/hooks/useDocumentConfiguration';
import { useDocumentTypeResolver } from '@/hooks/useDocumentTypeResolver';
import type { ChildDoc } from '@/hooks/useDocumentConfiguration';
import ChildDocFormModal from './ChildDocFormModal';

interface Props {
  configId: string;
  moduleId: string;
  supportiveDocsRule: 'all_required' | 'any_one_required';
}

export default function ChildDocumentsPanel({ configId, moduleId, supportiveDocsRule }: Props) {
  const { data: childDocs = [] } = useChildDocs(configId);
  const { createChildDoc, updateChildDoc, deleteChildDoc } = useChildDocMutations(moduleId);
  const { resolveDocType } = useDocumentTypeResolver();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDocType, setModalDocType] = useState<'supportive' | 'alternate'>('supportive');
  const [modalParentAltId, setModalParentAltId] = useState<string | null>(null);
  const [editingChild, setEditingChild] = useState<ChildDoc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; parent_config_id: string } | null>(null);
  const [expandedAlts, setExpandedAlts] = useState<Set<string>>(new Set());

  const supportiveDocs = childDocs.filter(d => d.doc_type === 'supportive' && !d.parent_alternate_id);
  const alternateDocs = childDocs.filter(d => d.doc_type === 'alternate' && !d.parent_alternate_id);

  const getAltSupportiveDocs = (altId: string) => childDocs.filter(d => d.doc_type === 'supportive' && d.parent_alternate_id === altId);

  const openModal = (docType: 'supportive' | 'alternate', parentAltId: string | null = null, child: ChildDoc | null = null) => {
    setModalDocType(docType);
    setModalParentAltId(parentAltId);
    setEditingChild(child);
    setModalOpen(true);
  };

  const handleSave = (data: Omit<ChildDoc, 'id' | 'created_at' | 'created_by' | 'updated_at' | 'updated_by'>) => {
    if (editingChild) {
      updateChildDoc.mutate({ id: editingChild.id, parent_config_id: configId, ...data }, { onSuccess: () => { setModalOpen(false); setEditingChild(null); } });
    } else {
      createChildDoc.mutate(data, { onSuccess: () => setModalOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteTarget) deleteChildDoc.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
  };

  const toggleAlt = (id: string) => {
    setExpandedAlts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const ruleLabel = supportiveDocsRule === 'any_one_required' ? 'Any one required' : 'All required';
  const ruleBadgeVariant = supportiveDocsRule === 'any_one_required' ? 'outline' : 'secondary';

  const renderDocRow = (child: ChildDoc, isAltSupportive = false) => (
    <div key={child.id} className={`flex items-center justify-between py-2.5 px-3 rounded-lg border transition-colors ${!child.is_active ? 'opacity-50' : ''} ${isAltSupportive ? 'bg-muted/30 ml-6 border-dashed' : 'bg-background hover:bg-muted/20'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{resolveDocType(child.document_name)}</span>
          <Badge variant="outline" className="text-xs font-mono shrink-0">{child.document_name}</Badge>
          <Badge variant={child.is_required ? 'destructive' : 'secondary'} className="text-xs shrink-0">
            {child.is_required ? 'Required' : 'Optional'}
          </Badge>
        </div>
        {child.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{child.description}</p>}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted-foreground">
            {child.allowed_extensions?.map(e => `.${e}`).join(', ')}
          </span>
          <span className="text-xs text-muted-foreground">• Max {child.max_file_size_mb} MB</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <Switch
          checked={child.is_active}
          onCheckedChange={() => updateChildDoc.mutate({ id: child.id, parent_config_id: configId, is_active: !child.is_active })}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openModal(child.doc_type as 'supportive' | 'alternate', child.parent_alternate_id, child)}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: child.id, parent_config_id: configId })}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 mt-3 pt-3 border-t">
      {/* Supportive Documents Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Supportive Documents</span>
            <Badge variant={ruleBadgeVariant} className="text-xs gap-1">
              {ruleLabel}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    {supportiveDocsRule === 'any_one_required'
                      ? 'The user only needs to upload at least one of the supportive documents listed below.'
                      : 'The user must upload all supportive documents that are marked as required.'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Badge>
            <span className="text-xs text-muted-foreground">({supportiveDocs.length})</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openModal('supportive')}>
            <Plus className="h-3 w-3" /> Add Supportive
          </Button>
        </div>
        {supportiveDocs.length === 0 ? (
          <p className="text-xs text-muted-foreground pl-6 italic">No supportive documents configured. Click "Add Supportive" to define additional evidence documents.</p>
        ) : (
          <div className="space-y-1.5">{supportiveDocs.map(d => renderDocRow(d))}</div>
        )}
      </div>

      {/* Alternate Documents Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Alternate Documents</span>
            <span className="text-xs text-muted-foreground">({alternateDocs.length})</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  Alternate documents can be submitted instead of the main document. Each alternate can have its own supportive documents.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openModal('alternate')}>
            <Plus className="h-3 w-3" /> Add Alternate
          </Button>
        </div>
        {alternateDocs.length === 0 ? (
          <p className="text-xs text-muted-foreground pl-6 italic">No alternate documents configured. Add alternates if users can submit a different document in place of this one.</p>
        ) : (
          <div className="space-y-1.5">
            {alternateDocs.map(alt => {
              const altSupps = getAltSupportiveDocs(alt.id);
              const isExpanded = expandedAlts.has(alt.id);
              return (
                <div key={alt.id}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleAlt(alt.id)}>
                    <div className={`flex items-center justify-between py-2.5 px-3 rounded-lg border transition-colors ${!alt.is_active ? 'opacity-50' : 'hover:bg-muted/20'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CollapsibleTrigger className="flex items-center gap-1 hover:text-primary">
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </CollapsibleTrigger>
                          <span className="font-medium text-sm truncate">{resolveDocType(alt.document_name)}</span>
                          <Badge variant="outline" className="text-xs font-mono shrink-0">{alt.document_name}</Badge>
                          <Badge variant={alt.is_required ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                            {alt.is_required ? 'Required' : 'Optional'}
                          </Badge>
                          {altSupps.length > 0 && (
                            <Badge variant="outline" className="text-xs shrink-0">{altSupps.length} supportive</Badge>
                          )}
                        </div>
                        {alt.description && <p className="text-xs text-muted-foreground mt-0.5 pl-5 truncate">{alt.description}</p>}
                        <div className="flex items-center gap-3 mt-1 pl-5">
                          <span className="text-xs text-muted-foreground">{alt.allowed_extensions?.map(e => `.${e}`).join(', ')}</span>
                          <span className="text-xs text-muted-foreground">• Max {alt.max_file_size_mb} MB</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Switch
                          checked={alt.is_active}
                          onCheckedChange={() => updateChildDoc.mutate({ id: alt.id, parent_config_id: configId, is_active: !alt.is_active })}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openModal('alternate', null, alt)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: alt.id, parent_config_id: configId })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <div className="mt-1.5 space-y-1.5">
                        <div className="flex items-center justify-between ml-6">
                          <span className="text-xs font-medium text-muted-foreground">Supportive docs for this alternate</span>
                          <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => openModal('supportive', alt.id)}>
                            <Plus className="h-3 w-3" /> Add
                          </Button>
                        </div>
                        {altSupps.length === 0 ? (
                          <p className="text-xs text-muted-foreground ml-8 italic">None configured.</p>
                        ) : (
                          altSupps.map(s => renderDocRow(s, true))
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <ChildDocFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingChild(null); }}
        onSave={handleSave}
        childDoc={editingChild}
        parentConfigId={configId}
        parentAlternateId={modalParentAltId}
        docType={modalDocType}
        isPending={createChildDoc.isPending || updateChildDoc.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this child document and any nested supportive documents.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
