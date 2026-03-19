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
import { Save, Play, Eye, Upload, History } from "lucide-react";
import NodeToolbox from "./NodeToolbox";
import PropertiesPanel from "./PropertiesPanel";
import FormBuilderDialog from "./FormBuilderDialog";
import ConditionBuilderDialog from "./ConditionBuilderDialog";
import ActionEditorDialog from "./ActionEditorDialog";
import WorkflowVersionDialog from "./WorkflowVersionDialog";
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
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [showConditionBuilder, setShowConditionBuilder] = useState(false);
  const [showActionEditor, setShowActionEditor] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

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

  const handleConfigureNode = () => {
    if (!selectedNode) return;
    
    const nodeType = selectedNode.data.type;
    if (nodeType === "task") {
      setShowFormBuilder(true);
    } else if (nodeType === "decision") {
      setShowConditionBuilder(true);
    } else if (nodeType === "automation") {
      setShowActionEditor(true);
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] lg:grid-cols-[280px_1fr_360px] gap-4 h-auto lg:h-[calc(100vh-240px)]">
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
            <Button onClick={() => setShowVersions(true)} size="sm" variant="outline" className="w-full">
              <History className="mr-2 h-4 w-4" />
              Versions
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
      <PropertiesPanel 
        selectedNode={selectedNode} 
        setNodes={setNodes}
        onConfigure={handleConfigureNode}
      />
    </div>

    <FormBuilderDialog
      open={showFormBuilder}
      onOpenChange={setShowFormBuilder}
      onSave={(fields) => console.log("Form fields:", fields)}
    />

    <ConditionBuilderDialog
      open={showConditionBuilder}
      onOpenChange={setShowConditionBuilder}
      onSave={(groups) => console.log("Conditions:", groups)}
    />

    <ActionEditorDialog
      open={showActionEditor}
      onOpenChange={setShowActionEditor}
      onSave={(config) => console.log("Action config:", config)}
    />

    <WorkflowVersionDialog
      open={showVersions}
      onOpenChange={setShowVersions}
      workflowName={workflowName}
    />
    </>
  );
}
