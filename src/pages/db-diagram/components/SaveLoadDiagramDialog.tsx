import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Save, Trash2, FolderOpen, Clock } from 'lucide-react';
import { type SavedLayout } from '@/services/dbDiagramLayoutService';

interface Props {
  open: boolean;
  onClose: () => void;
  savedLayouts: SavedLayout[];
  onSave: (name: string, isDefault: boolean) => void;
  onLoad: (layout: SavedLayout) => void;
  onDelete: (layoutId: string) => void;
  isSaving: boolean;
}

export function SaveLoadDiagramDialog({
  open, onClose, savedLayouts, onSave, onLoad, onDelete, isSaving,
}: Props) {
  const [tab, setTab] = useState<'save' | 'load'>('save');
  const [layoutName, setLayoutName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    if (!searchTerm) return savedLayouts;
    return savedLayouts.filter(l =>
      l.layout_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [savedLayouts, searchTerm]);

  const handleSave = () => {
    const name = layoutName.trim() || `Snapshot ${new Date().toLocaleDateString()}`;
    onSave(name, isDefault);
    setLayoutName('');
    setIsDefault(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Save / Load Diagram</DialogTitle>
          <DialogDescription>
            Save your current diagram layout or load a previously saved one.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 border rounded-lg p-1 bg-muted">
          <Button
            variant={tab === 'save' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setTab('save')}
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            Save
          </Button>
          <Button
            variant={tab === 'load' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setTab('load')}
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1" />
            Load
          </Button>
        </div>

        {tab === 'save' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Layout Name</Label>
              <Input
                placeholder="e.g., Core Tables Only, Full View..."
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} id="default-toggle" />
              <Label htmlFor="default-toggle" className="text-sm">
                Set as default layout for this module
              </Label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? 'Saving...' : 'Save Layout'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {tab === 'load' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search layouts..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <ScrollArea className="max-h-[300px]">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No saved layouts found
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(layout => (
                    <div
                      key={layout.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{layout.layout_name}</span>
                          {layout.is_default && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Default</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          {new Date(layout.updated_at).toLocaleString()}
                          <span className="mx-1">·</span>
                          {layout.included_table_ids.length > 0
                            ? `${layout.included_table_ids.length} tables`
                            : 'All tables'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button size="sm" variant="outline" onClick={() => onLoad(layout)}>
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(layout.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
