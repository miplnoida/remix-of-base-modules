import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DocCategory } from '@/hooks/useDocumentConfiguration';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: { category_name: string; description?: string; sort_order?: number }) => void;
  category?: DocCategory | null;
  isPending?: boolean;
}

export default function CategoryFormModal({ open, onClose, onSave, category, isPending }: Props) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [sort, setSort] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (category) {
      setName(category.category_name);
      setDesc(category.description || '');
      setSort(category.sort_order);
    } else {
      setName(''); setDesc(''); setSort(0);
    }
    setErrors({});
  }, [category, open]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Category name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({ category_name: name.trim(), description: desc.trim() || undefined, sort_order: sort });
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Add Category'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Category Name *</Label>
            <Input value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }} placeholder="e.g. Identity Documents" />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Sort Order</Label>
            <Input type="number" value={sort} onChange={e => setSort(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
