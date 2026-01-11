import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Module {
  id: string;
  name: string;
  display_name: string;
  parent_id: string | null;
}

interface TreeNode extends Module {
  children: TreeNode[];
  isLeaf: boolean;
}

interface Props {
  value: string;
  onChange: (moduleId: string) => void;
  placeholder?: string;
}

function buildTree(modules: Module[]): TreeNode[] {
  const moduleMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create TreeNode for each module
  modules.forEach(m => {
    moduleMap.set(m.id, { ...m, children: [], isLeaf: true });
  });

  // Build parent-child relationships
  modules.forEach(m => {
    const node = moduleMap.get(m.id)!;
    if (m.parent_id && moduleMap.has(m.parent_id)) {
      const parent = moduleMap.get(m.parent_id)!;
      parent.children.push(node);
      parent.isLeaf = false;
    } else if (!m.parent_id) {
      roots.push(node);
    }
  });

  // Sort children alphabetically
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.display_name.localeCompare(b.display_name));
    nodes.forEach(n => sortChildren(n.children));
  };
  sortChildren(roots);

  return roots;
}

function TreeNodeItem({ 
  node, 
  level, 
  expandedNodes, 
  toggleExpand, 
  onSelect,
  selectedId 
}: { 
  node: TreeNode; 
  level: number;
  expandedNodes: Set<string>;
  toggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors",
          isSelected && node.isLeaf && "bg-primary/10 text-primary",
          !node.isLeaf && "cursor-default opacity-80"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (node.isLeaf) {
            onSelect(node.id);
          } else if (hasChildren) {
            toggleExpand(node.id);
          }
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="p-0.5 hover:bg-accent rounded"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        {node.isLeaf ? (
          <FileText className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Folder className="h-4 w-4 text-amber-500" />
        )}
        <span className={cn("text-sm", !node.isLeaf && "font-medium")}>
          {node.display_name}
        </span>
        {!node.isLeaf && (
          <span className="text-xs text-muted-foreground ml-1">
            (parent)
          </span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map(child => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ModuleTreeSelector({ value, onChange, placeholder = "Select a module..." }: Props) {
  const [open, setOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const { data: modules } = useQuery({
    queryKey: ['modules-tree'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('id, name, display_name, parent_id')
        .eq('is_enabled', true)
        .order('sort_order', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Module[];
    }
  });

  const tree = React.useMemo(() => buildTree(modules || []), [modules]);
  
  const selectedModule = modules?.find(m => m.id === value);
  const selectedIsLeaf = React.useMemo(() => {
    if (!value || !modules) return false;
    // A module is a leaf if no other module has it as parent
    return !modules.some(m => m.parent_id === value);
  }, [value, modules]);

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  // Auto-expand parents of selected node
  React.useEffect(() => {
    if (value && modules) {
      const newExpanded = new Set(expandedNodes);
      let current = modules.find(m => m.id === value);
      while (current?.parent_id) {
        newExpanded.add(current.parent_id);
        current = modules.find(m => m.id === current?.parent_id);
      }
      if (newExpanded.size !== expandedNodes.size) {
        setExpandedNodes(newExpanded);
      }
    }
  }, [value, modules]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!selectedModule && "text-muted-foreground")}>
            {selectedModule ? selectedModule.display_name : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            <p className="text-xs text-muted-foreground mb-2 px-2">
              Select a leaf module (only leaf modules can be selected)
            </p>
            {tree.map(node => (
              <TreeNodeItem
                key={node.id}
                node={node}
                level={0}
                expandedNodes={expandedNodes}
                toggleExpand={toggleExpand}
                onSelect={handleSelect}
                selectedId={value}
              />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}