import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Edit, Trash2, Plus, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import type { DocConfig } from '@/hooks/useDocumentConfiguration';
import ChildDocumentsPanel from './ChildDocumentsPanel';

interface Props {
  documents: DocConfig[];
  moduleId: string;
  onAdd: () => void;
  onEdit: (doc: DocConfig) => void;
  onDelete: (doc: DocConfig) => void;
  onToggleActive: (doc: DocConfig) => void;
}

export default function DocumentList({ documents, moduleId, onAdd, onEdit, onDelete, onToggleActive }: Props) {
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  const toggleDoc = (id: string) => {
    setExpandedDocs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Documents ({documents.length})</h4>
        <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Document
        </Button>
      </div>
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 italic">No documents configured yet. Click "Add Document" to start.</p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => {
            const isExpanded = expandedDocs.has(doc.id);
            return (
              <div key={doc.id} className={`border rounded-lg transition-shadow ${!doc.is_active ? 'opacity-50' : 'hover:shadow-sm'}`}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleDoc(doc.id)}>
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CollapsibleTrigger className="flex items-center gap-1.5 hover:text-primary transition-colors">
                        {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </CollapsibleTrigger>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{doc.document_name}</span>
                          <Badge variant={doc.is_required ? 'destructive' : 'secondary'} className="text-xs">
                            {doc.is_required ? 'Required' : 'Optional'}
                          </Badge>
                          {doc.supportive_docs_rule === 'any_one_required' && (
                            <Badge variant="outline" className="text-xs text-primary border-primary/40">
                              Any 1 supportive
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {doc.allowed_extensions?.slice(0, 4).map(e => `.${e}`).join(', ')}
                            {(doc.allowed_extensions?.length || 0) > 4 && ` +${doc.allowed_extensions!.length - 4}`}
                          </span>
                          <span className="text-xs text-muted-foreground">• Max {doc.max_file_size_mb} MB</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <Switch checked={doc.is_active} onCheckedChange={() => onToggleActive(doc)} />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(doc)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(doc)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="px-3 pb-3">
                      <ChildDocumentsPanel configId={doc.id} moduleId={moduleId} supportiveDocsRule={doc.supportive_docs_rule || 'all_required'} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
