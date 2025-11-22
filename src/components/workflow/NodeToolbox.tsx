import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, GitBranch, Clock, Zap, GitFork, Circle } from "lucide-react";
import { Node } from "@xyflow/react";

interface NodeToolboxProps {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

const nodeTypes = [
  { type: "start", label: "Start", icon: Play, color: "text-green-600" },
  { type: "task", label: "Task", icon: Square, color: "text-blue-600" },
  { type: "decision", label: "Decision", icon: GitBranch, color: "text-orange-600" },
  { type: "timer", label: "Timer", icon: Clock, color: "text-purple-600" },
  { type: "automation", label: "Automation", icon: Zap, color: "text-yellow-600" },
  { type: "subflow", label: "Subflow", icon: GitFork, color: "text-cyan-600" },
  { type: "end", label: "End", icon: Circle, color: "text-red-600" },
];

export default function NodeToolbox({ setNodes }: NodeToolboxProps) {
  const addNode = (type: string, label: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type: type === "start" ? "input" : type === "end" ? "output" : "default",
      position: { x: Math.random() * 400 + 50, y: Math.random() * 400 + 100 },
      data: { label, type },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Node Types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {nodeTypes.map((node) => (
          <Button
            key={node.type}
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => addNode(node.type, node.label)}
          >
            <node.icon className={`mr-2 h-4 w-4 ${node.color}`} />
            {node.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
