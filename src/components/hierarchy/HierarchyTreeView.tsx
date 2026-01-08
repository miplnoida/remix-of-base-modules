import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
  Panel,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import HierarchyNode, { HierarchyNodeData } from './HierarchyNode';
import { Button } from '@/components/ui/button';
import { Maximize2, RotateCcw } from 'lucide-react';

export interface HierarchyItem {
  id: string;
  itemId: string;
  parentId: string | null;
  name: string;
  level: number;
  category?: string;
  isSystemRole?: boolean;
}

interface HierarchyTreeViewProps {
  items: HierarchyItem[];
  isLoading: boolean;
  canEdit: boolean;
  onEdit: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onRemove: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  emptyMessage?: string;
}

const nodeTypes = {
  hierarchy: HierarchyNode,
};

const NODE_WIDTH = 200;
const NODE_HEIGHT = 120;
const HORIZONTAL_SPACING = 60;
const VERTICAL_SPACING = 80;

export default function HierarchyTreeView({
  items,
  isLoading,
  canEdit,
  onEdit,
  onAddChild,
  onRemove,
  selectedId,
  onSelect,
  emptyMessage = "No hierarchy defined yet",
}: HierarchyTreeViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<HierarchyNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Initialize all nodes as expanded
  useEffect(() => {
    const allIds = new Set(items.map(item => item.itemId));
    setExpandedNodes(allIds);
  }, [items]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Build tree structure
  const { treeNodes, treeEdges } = useMemo(() => {
    if (items.length === 0) return { treeNodes: [], treeEdges: [] };

    const childrenMap = new Map<string | null, HierarchyItem[]>();
    items.forEach(item => {
      const parentKey = item.parentId || null;
      if (!childrenMap.has(parentKey)) {
        childrenMap.set(parentKey, []);
      }
      childrenMap.get(parentKey)!.push(item);
    });

    const hasChildren = (id: string) => {
      return childrenMap.has(id) && childrenMap.get(id)!.length > 0;
    };

    // Calculate subtree width
    const subtreeWidths = new Map<string, number>();
    
    const calculateWidth = (id: string | null): number => {
      const children = childrenMap.get(id) || [];
      if (children.length === 0) return NODE_WIDTH;
      
      const visibleChildren = id === null || expandedNodes.has(id) ? children : [];
      if (visibleChildren.length === 0) return NODE_WIDTH;
      
      let totalWidth = 0;
      visibleChildren.forEach((child, index) => {
        const childWidth = calculateWidth(child.itemId);
        subtreeWidths.set(child.itemId, childWidth);
        totalWidth += childWidth;
        if (index < visibleChildren.length - 1) {
          totalWidth += HORIZONTAL_SPACING;
        }
      });
      
      return Math.max(NODE_WIDTH, totalWidth);
    };

    calculateWidth(null);

    const resultNodes: Node<HierarchyNodeData>[] = [];
    const resultEdges: Edge[] = [];

    // Position nodes
    const positionNode = (
      item: HierarchyItem,
      x: number,
      y: number
    ) => {
      const nodeData: HierarchyNodeData = {
        id: item.itemId,
        name: item.name,
        level: item.level,
        category: item.category,
        isSystemRole: item.isSystemRole,
        hasChildren: hasChildren(item.itemId),
        isExpanded: expandedNodes.has(item.itemId),
        isSelected: selectedId === item.itemId,
        canEdit,
        onEdit,
        onAddChild,
        onRemove,
        onToggleExpand: handleToggleExpand,
        onSelect,
      };

      resultNodes.push({
        id: item.itemId,
        type: 'hierarchy',
        position: { x, y },
        data: nodeData,
      });

      if (item.parentId) {
        resultEdges.push({
          id: `${item.parentId}-${item.itemId}`,
          source: item.parentId,
          target: item.itemId,
          type: 'smoothstep',
          style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
          animated: false,
          markerEnd: {
            type: 'arrowclosed' as const,
            color: 'hsl(var(--primary))',
            width: 20,
            height: 20,
          },
        });
      }

      // Position children if expanded
      if (expandedNodes.has(item.itemId)) {
        const children = childrenMap.get(item.itemId) || [];
        if (children.length > 0) {
          const nodeWidth = subtreeWidths.get(item.itemId) || NODE_WIDTH;
          let childX = x - nodeWidth / 2 + NODE_WIDTH / 2;

          children.forEach(child => {
            const childWidth = subtreeWidths.get(child.itemId) || NODE_WIDTH;
            const childCenterX = childX + childWidth / 2 - NODE_WIDTH / 2;
            positionNode(child, childCenterX, y + NODE_HEIGHT + VERTICAL_SPACING);
            childX += childWidth + HORIZONTAL_SPACING;
          });
        }
      }
    };

    // Start with root nodes
    const rootNodes = childrenMap.get(null) || [];
    let startX = 0;
    
    // Calculate total width for root nodes
    let totalRootWidth = 0;
    rootNodes.forEach((root, index) => {
      const width = subtreeWidths.get(root.itemId) || NODE_WIDTH;
      totalRootWidth += width;
      if (index < rootNodes.length - 1) {
        totalRootWidth += HORIZONTAL_SPACING;
      }
    });

    startX = -totalRootWidth / 2 + NODE_WIDTH / 2;
    
    rootNodes.forEach(root => {
      const width = subtreeWidths.get(root.itemId) || NODE_WIDTH;
      const centerX = startX + width / 2 - NODE_WIDTH / 2;
      positionNode(root, centerX, 0);
      startX += width + HORIZONTAL_SPACING;
    });

    return { treeNodes: resultNodes, treeEdges: resultEdges };
  }, [items, expandedNodes, selectedId, canEdit, onEdit, onAddChild, onRemove, handleToggleExpand, onSelect]);

  // Update nodes and edges when tree changes
  useEffect(() => {
    setNodes(treeNodes);
    setEdges(treeEdges);
  }, [treeNodes, treeEdges, setNodes, setEdges]);

  const handlePaneClick = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-muted/20 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-muted-foreground">Loading hierarchy...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-muted/20 rounded-lg">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-muted/20 rounded-lg border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        panOnDrag
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls showInteractive={false} />
        <Panel position="top-right" className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" title="Expand All" onClick={() => {
            setExpandedNodes(new Set(items.map(i => i.itemId)));
          }}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" title="Collapse All" onClick={() => {
            setExpandedNodes(new Set());
          }}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
