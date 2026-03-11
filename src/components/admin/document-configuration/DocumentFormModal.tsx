import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { DocConfig } from '@/hooks/useDocumentConfiguration';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<DocConfig, 'id' | 'created_at' | 'created_by' | 'updated_at' | 'updated_by'>) => void;
  doc?: DocConfig | null;
  categoryId: string;
  isPending?: boolean;
}

const COMMON_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'tif', 'tiff', 'bmp', 'gif'];

export default function DocumentFormModal({ open, onClose, onSave, doc, categoryId, isPending }: Props) {
  const [form, setForm] = useState({
    document_name: '',
    is_required: true,
    allowed_extensions: ['pdf', 'jpg', 'png'] as string[],
    max_file_size_mb: 5,
    requires_supportive_doc: false,
    supportive_doc_description: '',
    allow_alternate_doc: false,
    alternate_doc_name: '',
    alternate_requires_supportive: false,
    alternate_supportive_description: '',
    sort_order: 0,
    is_active: true,
  });
  const [extInput, setExtInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (doc) {
      setForm({
        document_name: doc.document_name,
        is_required: doc.is_required,
        allowed_extensions: doc.allowed_extensions || [],
        max_file_size_mb: doc.max_file_size_mb,
        requires_supportive_doc: doc.requires_supportive_doc,
        supportive_doc_description: doc.supportive_doc_description || '',
        allow_alternate_doc: doc.allow_alternate_doc,
        alternate_doc_name: doc.alternate_doc_name || '',
        alternate_requires_supportive: doc.alternate_requires_supportive,
        alternate_supportive_description: doc.alternate_supportive_description || '',
        sort_order: doc.sort_order,
        is_active: doc.is_active,
      });
    } else {
      setForm({
        document_name: '',
        is_required: true,
        allowed_extensions: ['pdf', 'jpg', 'png'],
        max_file_size_mb: 5,
        requires_supportive_doc: false,
        supportive_doc_description: '',
        allow_alternate_doc: false,
        alternate_doc_name: '',
        alternate_requires_supportive: false,
        alternate_supportive_description: '',
        sort_order: 0,
        is_active: true,
      });
    }
    setExtInput('');
    setErrors({});
  }, [doc, open]);

  const set = (key: string, val: unknown) => {
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: '' }));
  };

  const addExtension = () => {
    const ext = extInput.trim().toLowerCase().replace(/^\./, '');
    if (!ext) return;
    if (!/^[a-z0-9]+$/.test(ext)) {
      setErrors(p => ({ ...p, ext: 'Invalid extension format' }));
      return;
    }
    if (form.allowed_extensions.includes(ext)) {
      setErrors(p => ({ ...p, ext: 'Extension already added' }));
      return;
    }
    set('allowed_extensions', [...form.allowed_extensions, ext]);
    setExtInput('');
    setErrors(p => ({ ...p, ext: '' }));
  };

  const removeExt = (ext: string) => {
    set('allowed_extensions', form.allowed_extensions.filter(e => e !== ext));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.document_name.trim()) e.document_name = 'Document name is required';
    if (form.allowed_extensions.length === 0) e.ext = 'At least one extension is required';
    if (form.max_file_size_mb <= 0 || form.max_file_size_mb > 100) e.max_file_size_mb = 'File size must be between 0.1 and 100 MB';
    if (form.allow_alternate_doc && !form.alternate_doc_name.trim()) e.alternate_doc_name = 'Alternate document name is required';
    if (form.requires_supportive_doc && !form.supportive_doc_description.trim()) e.supportive_doc_description = 'Please describe the supportive document';
    if (form.alternate_requires_supportive && !form.alternate_supportive_description.trim()) e.alternate_supportive_description = 'Please describe the alternate supportive document';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      category_id: categoryId,
      document_name: form.document_name.trim(),
      is_required: form.is_required,
      allowed_extensions: form.allowed_extensions,
      max_file_size_mb: form.max_file_size_mb,
      requires_supportive_doc: form.requires_supportive_doc,
      supportive_doc_description: form.supportive_doc_description.trim() || null,
      allow_alternate_doc: form.allow_alternate_doc,
      alternate_doc_name: form.alternate_doc_name.trim() || null,
      alternate_requires_supportive: form.alternate_requires_supportive,
      alternate_supportive_description: form.alternate_supportive_description.trim() || null,
      sort_order: form.sort_order,
      is_active: form.is_active,
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{doc ? 'Edit Document' : 'Add Document'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Document Name */}
          <div className="space-y-1.5">
            <Label>Document Name *</Label>
            <Input value={form.document_name} onChange={e => set('document_name', e.target.value)} placeholder="e.g. National ID" />
            {errors.document_name && <p className="text-xs text-destructive">{errors.document_name}</p>}
          </div>

          {/* Required / Sort / Active */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_required} onCheckedChange={v => set('is_required', v)} />
              <Label className="text-sm">Required</Label>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={e => set('sort_order', Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => set('is_active', v)} />
              <Label className="text-sm">Active</Label>
            </div>
          </div>

          {/* Allowed Extensions */}
          <div className="space-y-1.5">
            <Label>Allowed Extensions *</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.allowed_extensions.map(ext => (
                <Badge key={ext} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeExt(ext)}>
                  .{ext} ✕
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={extInput}
                onChange={e => { setExtInput(e.target.value); setErrors(p => ({ ...p, ext: '' })); }}
                placeholder="Type extension…"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExtension())}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addExtension}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {COMMON_EXTENSIONS.filter(e => !form.allowed_extensions.includes(e)).slice(0, 6).map(ext => (
                <Badge key={ext} variant="outline" className="cursor-pointer text-xs" onClick={() => set('allowed_extensions', [...form.allowed_extensions, ext])}>
                  + .{ext}
                </Badge>
              ))}
            </div>
            {errors.ext && <p className="text-xs text-destructive">{errors.ext}</p>}
          </div>

          {/* Max File Size */}
          <div className="space-y-1.5 max-w-[200px]">
            <Label>Max File Size (MB) *</Label>
            <Input type="number" step="0.1" min="0.1" max="100" value={form.max_file_size_mb} onChange={e => set('max_file_size_mb', Number(e.target.value))} />
            {errors.max_file_size_mb && <p className="text-xs text-destructive">{errors.max_file_size_mb}</p>}
          </div>

          {/* Supportive Document */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.requires_supportive_doc} onCheckedChange={v => set('requires_supportive_doc', v)} />
              <Label className="font-medium">Requires Supportive Document</Label>
            </div>
            {form.requires_supportive_doc && (
              <div className="space-y-1.5 pl-1">
                <Label className="text-sm">Supportive Document Description *</Label>
                <Textarea value={form.supportive_doc_description} onChange={e => set('supportive_doc_description', e.target.value)} rows={2} placeholder="Describe the required supportive document" />
                {errors.supportive_doc_description && <p className="text-xs text-destructive">{errors.supportive_doc_description}</p>}
              </div>
            )}
          </div>

          {/* Alternate Document */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.allow_alternate_doc} onCheckedChange={v => set('allow_alternate_doc', v)} />
              <Label className="font-medium">Allow Alternate Document</Label>
            </div>
            {form.allow_alternate_doc && (
              <div className="space-y-3 pl-1">
                <div className="space-y-1.5">
                  <Label className="text-sm">Alternate Document Name *</Label>
                  <Input value={form.alternate_doc_name} onChange={e => set('alternate_doc_name', e.target.value)} placeholder="e.g. Passport" />
                  {errors.alternate_doc_name && <p className="text-xs text-destructive">{errors.alternate_doc_name}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.alternate_requires_supportive} onCheckedChange={v => set('alternate_requires_supportive', v)} />
                  <Label className="text-sm">Alternate Requires Supportive Document</Label>
                </div>
                {form.alternate_requires_supportive && (
                  <div className="space-y-1.5">
                    <Label className="text-sm">Alternate Supportive Description *</Label>
                    <Textarea value={form.alternate_supportive_description} onChange={e => set('alternate_supportive_description', e.target.value)} rows={2} placeholder="Describe the supportive document for the alternate" />
                    {errors.alternate_supportive_description && <p className="text-xs text-destructive">{errors.alternate_supportive_description}</p>}
                  </div>
                )}
              </div>
            )}
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
