import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { ChildDoc } from '@/hooks/useDocumentConfiguration';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<ChildDoc, 'id' | 'created_at' | 'created_by' | 'updated_at' | 'updated_by'>) => void;
  childDoc?: ChildDoc | null;
  parentConfigId: string;
  parentAlternateId?: string | null;
  docType: 'supportive' | 'alternate';
  isPending?: boolean;
}

const COMMON_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'tif', 'tiff', 'bmp', 'gif'];

export default function ChildDocFormModal({ open, onClose, onSave, childDoc, parentConfigId, parentAlternateId, docType, isPending }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [extensions, setExtensions] = useState<string[]>(['pdf', 'jpg', 'png']);
  const [maxSize, setMaxSize] = useState(5);
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [extInput, setExtInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (childDoc) {
      setName(childDoc.document_name);
      setDescription(childDoc.description || '');
      setIsRequired(childDoc.is_required);
      setExtensions(childDoc.allowed_extensions || []);
      setMaxSize(childDoc.max_file_size_mb);
      setSortOrder(childDoc.sort_order);
      setIsActive(childDoc.is_active);
    } else {
      setName(''); setDescription(''); setIsRequired(docType === 'supportive' ? false : false);
      setExtensions(['pdf', 'jpg', 'png']); setMaxSize(5);
      setSortOrder(0); setIsActive(true);
    }
    setExtInput(''); setErrors({});
  }, [childDoc, open]);

  const addExt = () => {
    const ext = extInput.trim().toLowerCase().replace(/^\./, '');
    if (!ext) return;
    if (!/^[a-z0-9]+$/.test(ext)) { setErrors(p => ({ ...p, ext: 'Invalid extension' })); return; }
    if (extensions.includes(ext)) { setErrors(p => ({ ...p, ext: 'Already added' })); return; }
    setExtensions(p => [...p, ext]);
    setExtInput(''); setErrors(p => ({ ...p, ext: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Document name is required';
    if (extensions.length === 0) e.ext = 'At least one extension is required';
    if (maxSize <= 0 || maxSize > 100) e.maxSize = 'Must be 0.1–100 MB';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      parent_config_id: parentConfigId,
      parent_alternate_id: parentAlternateId || null,
      doc_type: docType,
      document_name: name.trim(),
      description: description.trim() || null,
      is_required: isRequired,
      allowed_extensions: extensions,
      max_file_size_mb: maxSize,
      sort_order: sortOrder,
      is_active: isActive,
    });
  };

  const typeLabel = docType === 'supportive' ? 'Supportive Document' : 'Alternate Document';

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{childDoc ? `Edit ${typeLabel}` : `Add ${typeLabel}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Document Name *</Label>
            <Input value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }} placeholder={`e.g. ${docType === 'supportive' ? 'Cover Letter' : 'Passport'}`} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              <Label className="text-sm">{docType === 'supportive' ? 'Required' : 'Required'}</Label>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label className="text-sm">Active</Label>
            </div>
          </div>

          {/* Extensions */}
          <div className="space-y-1.5">
            <Label>Allowed Extensions *</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {extensions.map(ext => (
                <Badge key={ext} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setExtensions(p => p.filter(e => e !== ext))}>
                  .{ext} ✕
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={extInput}
                onChange={e => { setExtInput(e.target.value); setErrors(p => ({ ...p, ext: '' })); }}
                placeholder="Type extension…"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExt())}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addExt}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {COMMON_EXTENSIONS.filter(e => !extensions.includes(e)).slice(0, 6).map(ext => (
                <Badge key={ext} variant="outline" className="cursor-pointer text-xs" onClick={() => setExtensions(p => [...p, ext])}>
                  + .{ext}
                </Badge>
              ))}
            </div>
            {errors.ext && <p className="text-xs text-destructive">{errors.ext}</p>}
          </div>

          <div className="space-y-1.5 max-w-[200px]">
            <Label>Max File Size (MB) *</Label>
            <Input type="number" step="0.1" min="0.1" max="100" value={maxSize} onChange={e => setMaxSize(Number(e.target.value))} />
            {errors.maxSize && <p className="text-xs text-destructive">{errors.maxSize}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>{isPending ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
