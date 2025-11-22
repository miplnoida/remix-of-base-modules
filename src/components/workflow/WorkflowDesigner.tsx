import { useState, useCallback } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Play, Eye, Upload, Download, Undo, Redo } from "lucide-react";
import NodeToolbox from "./NodeToolbox";
import PropertiesPanel from "./PropertiesPanel";
import { useToast } from "@/hooks/use-toast";

const initialNodes: Node[] = [
  {
    id: "start-1",
    type: "input",
    position: { x: 250, y: 50 },
    data: { label: "Start" },
  },
];

const initialEdges: Edge[] = [];

export default function WorkflowDesigner() {
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleSave = () => {
    toast({
      title: "Workflow Saved",
      description: `"${workflowName}" has been saved as draft`,
    });
  };

  const handlePublish = () => {
    toast({
      title: "Workflow Published",
      description: `"${workflowName}" is now active and ready for execution`,
    });
  };

  const handlePreview = () => {
    toast({
      title: "Preview Mode",
      description: "Simulating workflow execution...",
    });
  };

  return (
    <div className="grid grid-cols-[280px_1fr_360px] gap-4 h-[calc(100vh-240px)]">
      {/* Toolbox */}
      <div className="space-y-4">
        <Card className="p-4">
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Workflow name"
            className="mb-4"
          />
          <div className="flex flex-col gap-2">
            <Button onClick={handleSave} size="sm" className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button onClick={handlePublish} size="sm" variant="default" className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Publish
            </Button>
            <Button onClick={handlePreview} size="sm" variant="outline" className="w-full">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </div>
        </Card>

        <NodeToolbox setNodes={setNodes} />
      </div>

      {/* Canvas */}
      <Card className="overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </Card>

      {/* Properties Panel */}
      <PropertiesPanel selectedNode={selectedNode} setNodes={setNodes} />
    </div>
  );
}
