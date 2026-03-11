import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Edit, Trash2, Plus, FolderOpen } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useDocCategories, useCategoryMutations, useDocConfigMutations, useAllDocConfigsForModule } from '@/hooks/useDocumentConfiguration';
import type { DocCategory, DocConfig } from '@/hooks/useDocumentConfiguration';
import CategoryFormModal from './CategoryFormModal';
import DocumentFormModal from './DocumentFormModal';
import DocumentList from './DocumentList';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  moduleId: string;
}

export default function CategoryList({ moduleId }: Props) {
  const { data: categories = [], isLoading } = useDocCategories(moduleId);
  const { data: allDocs = [] } = useAllDocConfigsForModule(moduleId);
  const { createCategory, updateCategory, deleteCategory } = useCategoryMutations(moduleId);
  const { createDoc, updateDoc, deleteDoc } = useDocConfigMutations(moduleId);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<DocCategory | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docModalCatId, setDocModalCatId] = useState<string>('');
  const [editingDoc, setEditingDoc] = useState<DocConfig | null>(null);
  const [deleteDocTarget, setDeleteDocTarget] = useState<{ id: string; category_id: string } | null>(null);

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSaveCat = (data: { category_name: string; description?: string; sort_order?: number }) => {
    if (editingCat) {
      updateCategory.mutate({ id: editingCat.id, ...data }, { onSuccess: () => { setCatModalOpen(false); setEditingCat(null); } });
    } else {
      createCategory.mutate(data, { onSuccess: () => setCatModalOpen(false) });
    }
  };

  const handleConfirmDeleteCat = () => {
    if (deleteCatId) deleteCategory.mutate(deleteCatId, { onSuccess: () => setDeleteCatId(null) });
  };

  const handleSaveDoc = (data: Omit<DocConfig, 'id' | 'created_at' | 'created_by' | 'updated_at' | 'updated_by'>) => {
    if (editingDoc) {
      updateDoc.mutate({ id: editingDoc.id, ...data }, { onSuccess: () => { setDocModalOpen(false); setEditingDoc(null); } });
    } else {
      createDoc.mutate(data, { onSuccess: () => setDocModalOpen(false) });
    }
  };

  const handleConfirmDeleteDoc = () => {
    if (deleteDocTarget) deleteDoc.mutate(deleteDocTarget, { onSuccess: () => setDeleteDocTarget(null) });
  };

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Document Categories</h3>
        <Button onClick={() => { setEditingCat(null); setCatModalOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No categories configured. Click "Add Category" to begin.</p>
          </CardContent>
        </Card>
      ) : (
        categories.map(cat => {
          const catDocs = allDocs.filter(d => d.category_id === cat.id);
          const isOpen = openCategories.has(cat.id);
          return (
            <Card key={cat.id} className={!cat.is_active ? 'opacity-60' : ''}>
              <Collapsible open={isOpen} onOpenChange={() => toggleCategory(cat.id)}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <CardTitle className="text-base">{cat.category_name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">{catDocs.length} docs</Badge>
                      {!cat.is_active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={cat.is_active}
                        onCheckedChange={v => updateCategory.mutate({ id: cat.id, is_active: v })}
                      />
                      <Button size="icon" variant="ghost" onClick={() => { setEditingCat(cat); setCatModalOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteCatId(cat.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {cat.description && <p className="text-sm text-muted-foreground mt-1 ml-6">{cat.description}</p>}
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    <DocumentList
                      documents={catDocs}
                      moduleId={moduleId}
                      onAdd={() => { setEditingDoc(null); setDocModalCatId(cat.id); setDocModalOpen(true); }}
                      onEdit={doc => { setEditingDoc(doc); setDocModalCatId(cat.id); setDocModalOpen(true); }}
                      onDelete={doc => setDeleteDocTarget({ id: doc.id, category_id: doc.category_id })}
                      onToggleActive={doc => updateDoc.mutate({ id: doc.id, category_id: doc.category_id, is_active: !doc.is_active })}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })
      )}

      {/* Category Modal */}
      <CategoryFormModal
        open={catModalOpen}
        onClose={() => { setCatModalOpen(false); setEditingCat(null); }}
        onSave={handleSaveCat}
        category={editingCat}
        isPending={createCategory.isPending || updateCategory.isPending}
      />

      {/* Document Modal */}
      <DocumentFormModal
        open={docModalOpen}
        onClose={() => { setDocModalOpen(false); setEditingDoc(null); }}
        onSave={handleSaveDoc}
        doc={editingDoc}
        categoryId={docModalCatId}
        isPending={createDoc.isPending || updateDoc.isPending}
      />

      {/* Delete Category Confirm */}
      <AlertDialog open={!!deleteCatId} onOpenChange={() => setDeleteCatId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category and all documents within it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteCat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Document Confirm */}
      <AlertDialog open={!!deleteDocTarget} onOpenChange={() => setDeleteDocTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this document configuration. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteDoc} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
