import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wand2, Table2 } from "lucide-react";

interface WorkflowModeSelectorProps {
  selectedMode: "designer" | "manual";
  onModeChange: (mode: "designer" | "manual") => void;
}

export default function WorkflowModeSelector({ selectedMode, onModeChange }: WorkflowModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <Card 
        className={`cursor-pointer transition-all ${
          selectedMode === "designer" 
            ? "ring-2 ring-primary shadow-lg" 
            : "hover:shadow-md"
        }`}
        onClick={() => onModeChange("designer")}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              selectedMode === "designer" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted"
            }`}>
              <Wand2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Visual Designer</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Drag and drop nodes on canvas to build your workflow visually
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="text-xs bg-secondary px-2 py-1 rounded">Drag & Drop</span>
              <span className="text-xs bg-secondary px-2 py-1 rounded">Visual Canvas</span>
              <span className="text-xs bg-secondary px-2 py-1 rounded">Interactive</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card 
        className={`cursor-pointer transition-all ${
          selectedMode === "manual" 
            ? "ring-2 ring-primary shadow-lg" 
            : "hover:shadow-md"
        }`}
        onClick={() => onModeChange("manual")}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              selectedMode === "manual" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted"
            }`}>
              <Table2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Manual Builder</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create workflow steps using structured forms in a table view
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="text-xs bg-secondary px-2 py-1 rounded">Form-Based</span>
              <span className="text-xs bg-secondary px-2 py-1 rounded">Table View</span>
              <span className="text-xs bg-secondary px-2 py-1 rounded">Structured</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
