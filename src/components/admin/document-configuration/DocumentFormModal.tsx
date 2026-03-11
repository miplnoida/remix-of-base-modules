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

const DEFAULT_FORM = {
  document_name: '',
  is_required: true,
  allowed_extensions: ['pdf', 'jpg', 'png'] as string[],
  max_file_size_mb: 5,
  requires_supportive_doc: false,
  supportive_doc_description: '',
  supportive_allowed_extensions: ['pdf', 'jpg', 'png'] as string[],
  supportive_max_file_size_mb: 5,
  allow_alternate_doc: false,
  alternate_doc_name: '',
  alternate_allowed_extensions: ['pdf', 'jpg', 'png'] as string[],
  alternate_max_file_size_mb: 5,
  alternate_requires_supportive: false,
  alternate_supportive_description: '',
  alternate_supportive_allowed_extensions: ['pdf', 'jpg', 'png'] as string[],
  alternate_supportive_max_file_size_mb: 5,
  sort_order: 0,
  is_active: true,
};

type FormState = typeof DEFAULT_FORM;

export default function DocumentFormModal({ open, onClose, onSave, doc, categoryId, isPending }: Props) {
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Per-section extension input state
  const [extInput, setExtInput] = useState('');
  const [suppExtInput, setSuppExtInput] = useState('');
  const [altExtInput, setAltExtInput] = useState('');
  const [altSuppExtInput, setAltSuppExtInput] = useState('');

  useEffect(() => {
    if (doc) {
      setForm({
        document_name: doc.document_name,
        is_required: doc.is_required,
        allowed_extensions: doc.allowed_extensions || [],
        max_file_size_mb: doc.max_file_size_mb,
        requires_supportive_doc: doc.requires_supportive_doc,
        supportive_doc_description: doc.supportive_doc_description || '',
        supportive_allowed_extensions: doc.supportive_allowed_extensions || ['pdf', 'jpg', 'png'],
        supportive_max_file_size_mb: doc.supportive_max_file_size_mb ?? 5,
        allow_alternate_doc: doc.allow_alternate_doc,
        alternate_doc_name: doc.alternate_doc_name || '',
        alternate_allowed_extensions: doc.alternate_allowed_extensions || ['pdf', 'jpg', 'png'],
        alternate_max_file_size_mb: doc.alternate_max_file_size_mb ?? 5,
        alternate_requires_supportive: doc.alternate_requires_supportive,
        alternate_supportive_description: doc.alternate_supportive_description || '',
        alternate_supportive_allowed_extensions: doc.alternate_supportive_allowed_extensions || ['pdf', 'jpg', 'png'],
        alternate_supportive_max_file_size_mb: doc.alternate_supportive_max_file_size_mb ?? 5,
        sort_order: doc.sort_order,
        is_active: doc.is_active,
      });
    } else {
      setForm({ ...DEFAULT_FORM });
    }
    setExtInput('');
    setSuppExtInput('');
    setAltExtInput('');
    setAltSuppExtInput('');
    setErrors({});
  }, [doc, open]);

  const set = (key: string, val: unknown) => {
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: '' }));
  };

  // Generic extension helpers
  const addExt = (field: keyof FormState, inputVal: string, setInputVal: (v: string) => void, errKey: string) => {
    const ext = inputVal.trim().toLowerCase().replace(/^\./, '');
    if (!ext) return;
    if (!/^[a-z0-9]+$/.test(ext)) { setErrors(p => ({ ...p, [errKey]: 'Invalid extension format' })); return; }
    const current = form[field] as string[];
    if (current.includes(ext)) { setErrors(p => ({ ...p, [errKey]: 'Extension already added' })); return; }
    set(field, [...current, ext]);
    setInputVal('');
    setErrors(p => ({ ...p, [errKey]: '' }));
  };

  const removeExt = (field: keyof FormState, ext: string) => {
    set(field, (form[field] as string[]).filter(e => e !== ext));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.document_name.trim()) e.document_name = 'Document name is required';
    if (form.allowed_extensions.length === 0) e.ext = 'At least one extension is required';
    if (form.max_file_size_mb <= 0 || form.max_file_size_mb > 100) e.max_file_size_mb = 'File size must be between 0.1 and 100 MB';
    if (form.requires_supportive_doc) {
      if (!form.supportive_doc_description.trim()) e.supportive_doc_description = 'Please describe the supportive document';
      if (form.supportive_allowed_extensions.length === 0) e.supp_ext = 'At least one extension is required';
      if (form.supportive_max_file_size_mb <= 0 || form.supportive_max_file_size_mb > 100) e.supportive_max_file_size_mb = 'File size must be between 0.1 and 100 MB';
    }
    if (form.allow_alternate_doc) {
      if (!form.alternate_doc_name.trim()) e.alternate_doc_name = 'Alternate document name is required';
      if (form.alternate_allowed_extensions.length === 0) e.alt_ext = 'At least one extension is required';
      if (form.alternate_max_file_size_mb <= 0 || form.alternate_max_file_size_mb > 100) e.alternate_max_file_size_mb = 'File size must be between 0.1 and 100 MB';
      if (form.alternate_requires_supportive) {
        if (!form.alternate_supportive_description.trim()) e.alternate_supportive_description = 'Please describe the alternate supportive document';
        if (form.alternate_supportive_allowed_extensions.length === 0) e.alt_supp_ext = 'At least one extension is required';
        if (form.alternate_supportive_max_file_size_mb <= 0 || form.alternate_supportive_max_file_size_mb > 100) e.alternate_supportive_max_file_size_mb = 'File size must be between 0.1 and 100 MB';
      }
    }
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
      supportive_allowed_extensions: form.requires_supportive_doc ? form.supportive_allowed_extensions : null,
      supportive_max_file_size_mb: form.requires_supportive_doc ? form.supportive_max_file_size_mb : null,
      allow_alternate_doc: form.allow_alternate_doc,
      alternate_doc_name: form.alternate_doc_name.trim() || null,
      alternate_allowed_extensions: form.allow_alternate_doc ? form.alternate_allowed_extensions : null,
      alternate_max_file_size_mb: form.allow_alternate_doc ? form.alternate_max_file_size_mb : null,
      alternate_requires_supportive: form.alternate_requires_supportive,
      alternate_supportive_description: form.alternate_supportive_description.trim() || null,
      alternate_supportive_allowed_extensions: form.allow_alternate_doc && form.alternate_requires_supportive ? form.alternate_supportive_allowed_extensions : null,
      alternate_supportive_max_file_size_mb: form.allow_alternate_doc && form.alternate_requires_supportive ? form.alternate_supportive_max_file_size_mb : null,
      sort_order: form.sort_order,
      is_active: form.is_active,
    });
  };

  // Reusable extension picker UI
  const renderExtensionPicker = (
    field: keyof FormState,
    inputVal: string,
    setInputVal: (v: string) => void,
    errKey: string,
    label: string
  ) => {
    const current = form[field] as string[];
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">{label} *</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {current.map(ext => (
            <Badge key={ext} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeExt(field, ext)}>
              .{ext} ✕
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={inputVal}
            onChange={e => { setInputVal(e.target.value); setErrors(p => ({ ...p, [errKey]: '' })); }}
            placeholder="Type extension…"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExt(field, inputVal, setInputVal, errKey))}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => addExt(field, inputVal, setInputVal, errKey)}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {COMMON_EXTENSIONS.filter(e => !current.includes(e)).slice(0, 6).map(ext => (
            <Badge key={ext} variant="outline" className="cursor-pointer text-xs" onClick={() => set(field, [...current, ext])}>
              + .{ext}
            </Badge>
          ))}
        </div>
        {errors[errKey] && <p className="text-xs text-destructive">{errors[errKey]}</p>}
      </div>
    );
  };

  const renderFileSizeInput = (field: keyof FormState, label: string) => (
    <div className="space-y-1.5 max-w-[200px]">
      <Label className="text-sm">{label} *</Label>
      <Input type="number" step="0.1" min="0.1" max="100" value={form[field] as number} onChange={e => set(field, Number(e.target.value))} />
      {errors[field] && <p className="text-xs text-destructive">{errors[field]}</p>}
    </div>
  );

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

          {/* Main Document Extensions & Size */}
          {renderExtensionPicker('allowed_extensions', extInput, setExtInput, 'ext', 'Allowed Extensions')}
          {renderFileSizeInput('max_file_size_mb', 'Max File Size (MB)')}

          {/* Supportive Document */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.requires_supportive_doc} onCheckedChange={v => set('requires_supportive_doc', v)} />
              <Label className="font-medium">Requires Supportive Document</Label>
            </div>
            {form.requires_supportive_doc && (
              <div className="space-y-3 pl-1">
                <div className="space-y-1.5">
                  <Label className="text-sm">Supportive Document Description *</Label>
                  <Textarea value={form.supportive_doc_description} onChange={e => set('supportive_doc_description', e.target.value)} rows={2} placeholder="Describe the required supportive document" />
                  {errors.supportive_doc_description && <p className="text-xs text-destructive">{errors.supportive_doc_description}</p>}
                </div>
                {renderExtensionPicker('supportive_allowed_extensions', suppExtInput, setSuppExtInput, 'supp_ext', 'Supportive Doc Allowed Extensions')}
                {renderFileSizeInput('supportive_max_file_size_mb', 'Supportive Doc Max File Size (MB)')}
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
                {renderExtensionPicker('alternate_allowed_extensions', altExtInput, setAltExtInput, 'alt_ext', 'Alternate Doc Allowed Extensions')}
                {renderFileSizeInput('alternate_max_file_size_mb', 'Alternate Doc Max File Size (MB)')}

                {/* Alternate Supportive */}
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.alternate_requires_supportive} onCheckedChange={v => set('alternate_requires_supportive', v)} />
                    <Label className="text-sm">Alternate Requires Supportive Document</Label>
                  </div>
                  {form.alternate_requires_supportive && (
                    <div className="space-y-3 pl-1">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Alternate Supportive Description *</Label>
                        <Textarea value={form.alternate_supportive_description} onChange={e => set('alternate_supportive_description', e.target.value)} rows={2} placeholder="Describe the supportive document for the alternate" />
                        {errors.alternate_supportive_description && <p className="text-xs text-destructive">{errors.alternate_supportive_description}</p>}
                      </div>
                      {renderExtensionPicker('alternate_supportive_allowed_extensions', altSuppExtInput, setAltSuppExtInput, 'alt_supp_ext', 'Alt. Supportive Doc Allowed Extensions')}
                      {renderFileSizeInput('alternate_supportive_max_file_size_mb', 'Alt. Supportive Doc Max File Size (MB)')}
                    </div>
                  )}
                </div>
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
