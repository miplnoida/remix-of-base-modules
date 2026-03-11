import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVerifyTypes } from '@/hooks/useIPMasterLookups';
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
  const { data: verifyTypes = [] } = useVerifyTypes();
  const [docCode, setDocCode] = useState('');
  const [docCodeOpen, setDocCodeOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [extensions, setExtensions] = useState<string[]>(['pdf', 'jpg', 'png']);
  const [maxSize, setMaxSize] = useState(5);
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [supportiveDocsRule, setSupportiveDocsRule] = useState<'all_required' | 'any_one_required'>('all_required');
  const [extInput, setExtInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (doc) {
      setDocCode(doc.document_name);
      setDescription((doc as any).description || '');
      setIsRequired(doc.is_required);
      setExtensions(doc.allowed_extensions || []);
      setMaxSize(doc.max_file_size_mb);
      setSortOrder(doc.sort_order);
      setIsActive(doc.is_active);
      setSupportiveDocsRule(doc.supportive_docs_rule || 'all_required');
    } else {
      setDocCode(''); setDescription(''); setIsRequired(true);
      setExtensions(['pdf', 'jpg', 'png']); setMaxSize(5);
      setSortOrder(0); setIsActive(true); setSupportiveDocsRule('all_required');
    }
    setExtInput(''); setErrors({});
  }, [doc, open]);

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
    if (!docCode) e.name = 'Please select a document type from the list';
    if (extensions.length === 0) e.ext = 'At least one extension is required';
    if (maxSize <= 0 || maxSize > 100) e.maxSize = 'Must be 0.1–100 MB';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      category_id: categoryId,
      document_name: docCode,
      is_required: isRequired,
      allowed_extensions: extensions,
      max_file_size_mb: maxSize,
      supportive_docs_rule: supportiveDocsRule,
      requires_supportive_doc: false,
      supportive_doc_description: null,
      supportive_allowed_extensions: null,
      supportive_max_file_size_mb: null,
      allow_alternate_doc: false,
      alternate_doc_name: null,
      alternate_allowed_extensions: null,
      alternate_max_file_size_mb: null,
      alternate_requires_supportive: false,
      alternate_supportive_description: null,
      alternate_supportive_allowed_extensions: null,
      alternate_supportive_max_file_size_mb: null,
      sort_order: sortOrder,
      is_active: isActive,
    } as any);
  };

  const selectedVerify = verifyTypes.find(v => v.code === docCode);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{doc ? 'Edit Document' : 'Add Document'}</DialogTitle>
          <DialogDescription>
            Select a document type from the master list. You can add supportive and alternate documents after saving.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Document Type *</Label>
            <Popover open={docCodeOpen} onOpenChange={setDocCodeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={docCodeOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedVerify
                      ? `${selectedVerify.description} (${selectedVerify.code})`
                      : 'Select document type…'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search document types…" />
                  <CommandList>
                    <CommandEmpty>No document type found.</CommandEmpty>
                    <CommandGroup>
                      {verifyTypes.map(vt => (
                        <CommandItem
                          key={vt.code}
                          value={`${vt.description} ${vt.code}`}
                          onSelect={() => {
                            setDocCode(vt.code);
                            setDocCodeOpen(false);
                            setErrors(p => ({ ...p, name: '' }));
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', docCode === vt.code ? 'opacity-100' : 'opacity-0')} />
                          <span className="flex-1 truncate">{vt.description}</span>
                          <Badge variant="outline" className="ml-2 text-xs shrink-0">{vt.code}</Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description of this document" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              <Label className="text-sm">Required</Label>
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

          {/* Max File Size */}
          <div className="space-y-1.5 max-w-[200px]">
            <Label>Max File Size (MB) *</Label>
            <Input type="number" step="0.1" min="0.1" max="100" value={maxSize} onChange={e => setMaxSize(Number(e.target.value))} />
            {errors.maxSize && <p className="text-xs text-destructive">{errors.maxSize}</p>}
          </div>

          {/* Supportive Documents Rule */}
          <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
            <Label className="text-sm font-semibold">Supportive Documents Submission Rule</Label>
            <p className="text-xs text-muted-foreground">
              When multiple supportive documents are configured, how should they be validated?
            </p>
            <RadioGroup value={supportiveDocsRule} onValueChange={(v) => setSupportiveDocsRule(v as 'all_required' | 'any_one_required')}>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="all_required" id="rule-all" className="mt-0.5" />
                <div>
                  <Label htmlFor="rule-all" className="text-sm font-medium cursor-pointer">All supportive documents are required</Label>
                  <p className="text-xs text-muted-foreground">User must upload every supportive document marked as required</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="any_one_required" id="rule-any" className="mt-0.5" />
                <div>
                  <Label htmlFor="rule-any" className="text-sm font-medium cursor-pointer">Any one supportive document is sufficient</Label>
                  <p className="text-xs text-muted-foreground">User only needs to upload at least one supportive document</p>
                </div>
              </div>
            </RadioGroup>
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
