import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Play, Eye, Copy, Archive } from "lucide-react";
import { mockWorkflows } from "@/services/mockData/workflowData";
import { useToast } from "@/hooks/use-toast";

export default function WorkflowList() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredWorkflows = mockWorkflows.filter(
    (wf) =>
      wf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wf.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAction = (action: string, workflowName: string) => {
    toast({ title: action, description: `Action performed on "${workflowName}"` });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search workflows..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Workflow
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWorkflows.map((workflow) => (
              <TableRow key={workflow.id}>
                <TableCell className="font-medium">{workflow.name}</TableCell>
                <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                  {workflow.description}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={workflow.status === "Active" ? "default" : "secondary"}
                  >
                    {workflow.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {workflow.activeVersionNumber ? `v${workflow.activeVersionNumber}` : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {workflow.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(workflow.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction("Edit", workflow.name)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction("Run", workflow.name)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction("View", workflow.name)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction("Duplicate", workflow.name)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
