import React, { useEffect } from 'react';
import {
  ReactFlow, useNodesState, useEdgesState, Controls, Background,
  BackgroundVariant, MiniMap, MarkerType, Node, Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { DbModule, DbModuleDependency } from '@/services/dbDiagramService';

interface Props {
  modules: DbModule[];
  dependencies: DbModuleDependency[];
}

const CRITICALITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

export function ModuleDependencyView({ modules, dependencies }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!modules.length) return;

    const COLS = Math.max(3, Math.ceil(Math.sqrt(modules.length)));
    const GAP_X = 280;
    const GAP_Y = 160;

    const newNodes: Node[] = modules.map((mod, idx) => ({
      id: mod.id,
      position: { x: (idx % COLS) * GAP_X, y: Math.floor(idx / COLS) * GAP_Y },
      data: { label: mod.module_name },
      style: {
        background: 'hsl(var(--card))',
        border: '2px solid hsl(var(--primary))',
        borderRadius: '8px',
        padding: '12px 20px',
        fontWeight: 600,
        fontSize: '13px',
        color: 'hsl(var(--foreground))',
      },
    }));

    const newEdges: Edge[] = dependencies.map(dep => ({
      id: dep.id,
      source: dep.source_module_id,
      target: dep.target_module_id,
      label: dep.dependency_type,
      type: 'smoothstep',
      style: { stroke: CRITICALITY_COLORS[dep.criticality] || '#94a3b8', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: CRITICALITY_COLORS[dep.criticality] || '#94a3b8' },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [modules, dependencies]);

  if (!modules.length) {
    return (
      <Card className="h-[500px] flex items-center justify-center text-muted-foreground">
        No module dependency data available. Run reanalysis to generate.
      </Card>
    );
  }

  return (
    <Card className="h-[500px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
    </Card>
  );
}
