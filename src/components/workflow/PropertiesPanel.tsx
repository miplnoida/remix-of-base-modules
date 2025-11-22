import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Node } from "@xyflow/react";
import { AlertCircle } from "lucide-react";

interface PropertiesPanelProps {
  selectedNode: Node | null;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

export default function PropertiesPanel({ selectedNode, setNodes }: PropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            <p>Select a node to edit properties</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const updateNodeData = (field: string, value: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id
          ? { ...node, data: { ...node.data, [field]: value } }
          : node
      )
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Properties</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Node Type</Label>
          <Input value={String(selectedNode.data.type || selectedNode.type)} disabled />
        </div>

        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={(selectedNode.data.label as string) || ""}
            onChange={(e) => updateNodeData("label", e.target.value)}
            placeholder="Node label"
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={(selectedNode.data.description as string) || ""}
            onChange={(e) => updateNodeData("description", e.target.value)}
            placeholder="Node description"
            rows={3}
          />
        </div>

        {selectedNode.data.type === "task" && (
          <div className="space-y-2">
            <Label>Assign To</Label>
            <Input
              value={(selectedNode.data.assignTo as string) || ""}
              onChange={(e) => updateNodeData("assignTo", e.target.value)}
              placeholder="Role or user"
            />
          </div>
        )}

        {selectedNode.data.type === "timer" && (
          <div className="space-y-2">
            <Label>Wait Duration (hours)</Label>
            <Input
              type="number"
              value={(selectedNode.data.hours as number) || 24}
              onChange={(e) => updateNodeData("hours", parseInt(e.target.value))}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
