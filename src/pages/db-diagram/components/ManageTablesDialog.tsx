import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Minus, Table2, AlertTriangle } from 'lucide-react';
import { type DbTable, TABLE_CATEGORIES } from '@/services/dbDiagramService';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Tables currently visible in the diagram */
  currentTableIds: Set<string>;
  /** All available tables in the system */
  allTables: DbTable[];
  /** Tables belonging to this module */
  moduleTableIds: Set<string>;
  /** Current module name for display */
  moduleName: string;
  isAdmin: boolean;
  onAddTables: (tableIds: string[]) => void;
  onRemoveTables: (tableIds: string[], updateMapping: boolean) => void;
}

export function ManageTablesDialog({
  open, onClose, currentTableIds, allTables, moduleTableIds, moduleName,
  isAdmin, onAddTables, onRemoveTables,
}: Props) {
  const [tab, setTab] = useState<'add' | 'remove'>('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updateMapping, setUpdateMapping] = useState(false);

  // Tables available to add (not currently in diagram)
  const addableTables = useMemo(() => {
    return allTables
      .filter(t => !currentTableIds.has(t.id))
      .filter(t => !searchTerm || t.table_name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allTables, currentTableIds, searchTerm]);

  // Tables currently in diagram that can be removed
  const removableTables = useMemo(() => {
    return allTables
      .filter(t => currentTableIds.has(t.id))
      .filter(t => !searchTerm || t.table_name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allTables, currentTableIds, searchTerm]);

  // Group addable tables by module
  const groupedAddable = useMemo(() => {
    const groups: Record<string, DbTable[]> = { 'Unassigned': [] };
    addableTables.forEach(t => {
      const cat = TABLE_CATEGORIES[t.table_category]?.label || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return Object.entries(groups).filter(([, tables]) => tables.length > 0);
  }, [addableTables]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAction = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (tab === 'add') {
      onAddTables(ids);
    } else {
      onRemoveTables(ids, updateMapping);
    }
    setSelectedIds(new Set());
  };

  const handleTabChange = (newTab: 'add' | 'remove') => {
    setTab(newTab);
    setSelectedIds(new Set());
    setSearchTerm('');
  };

  const displayTables = tab === 'add' ? addableTables : removableTables;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Manage Tables — {moduleName}</DialogTitle>
          <DialogDescription>
            Add or remove tables from the current diagram view. {isAdmin && 'Admins can also update module-table mappings.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 border rounded-lg p-1 bg-muted">
          <Button
            variant={tab === 'add' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => handleTabChange('add')}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Tables
          </Button>
          <Button
            variant={tab === 'remove' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => handleTabChange('remove')}
          >
            <Minus className="h-3.5 w-3.5 mr-1" />
            Remove Tables
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <ScrollArea className="max-h-[350px]">
          {displayTables.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {tab === 'add' ? 'No additional tables available' : 'No tables to remove'}
            </div>
          ) : (
            <div className="space-y-1">
              {displayTables.map(table => {
                const cat = TABLE_CATEGORIES[table.table_category];
                const isInModule = moduleTableIds.has(table.id);
                return (
                  <div
                    key={table.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      selectedIds.has(table.id)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted/50 border-transparent'
                    }`}
                    onClick={() => toggleSelect(table.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(table.id)}
                      onCheckedChange={() => toggleSelect(table.id)}
                    />
                    <Table2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-mono font-medium truncate block">
                        {table.table_name}
                      </span>
                      {table.description && (
                        <span className="text-[11px] text-muted-foreground truncate block">
                          {table.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {cat && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                          style={{ borderColor: cat.color, color: cat.color }}
                        >
                          {cat.label}
                        </Badge>
                      )}
                      {!isInModule && tab === 'add' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Other Module
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {tab === 'remove' && isAdmin && selectedIds.size > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="text-xs text-destructive font-medium">
                Admin: Also remove from module mapping?
              </p>
              <p className="text-[11px] text-muted-foreground">
                This will permanently unlink the selected tables from the "{moduleName}" module in the database.
              </p>
              <div className="flex items-center gap-2">
                <Switch
                  checked={updateMapping}
                  onCheckedChange={setUpdateMapping}
                  id="update-mapping"
                />
                <Label htmlFor="update-mapping" className="text-xs">
                  Update module mapping
                </Label>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} table{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleAction}
                disabled={selectedIds.size === 0}
                variant={tab === 'remove' ? 'destructive' : 'default'}
              >
                {tab === 'add' ? (
                  <><Plus className="h-4 w-4 mr-1" /> Add to Diagram</>
                ) : (
                  <><Minus className="h-4 w-4 mr-1" /> Remove from Diagram</>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
