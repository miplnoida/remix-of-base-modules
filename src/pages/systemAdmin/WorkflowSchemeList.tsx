import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Settings, Eye } from "lucide-react";
import { workflowSchemes } from "@/services/mockData/systemAdminData";
import { useToast } from "@/hooks/use-toast";
import { WorkflowFormDialog } from "@/components/systemAdmin/WorkflowFormDialog";
import { WorkflowDetailDialog } from "@/components/systemAdmin/WorkflowDetailDialog";
import { WorkflowStepsDialog } from "@/components/systemAdmin/WorkflowStepsDialog";
import { useState } from "react";
import { WorkflowScheme } from "@/types/systemAdmin";

export default function WorkflowSchemeList() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowScheme | undefined>();
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workflow Configuration</h1>
          <p className="text-muted-foreground">Configure approval workflows for all modules</p>
        </div>
        <Button onClick={() => { setSelectedWorkflow(undefined); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Schemes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow Name</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflowSchemes.map((scheme) => (
                <TableRow key={scheme.schemeId}>
                  <TableCell className="font-medium">{scheme.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{scheme.moduleName}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md">{scheme.description}</TableCell>
                  <TableCell>
                    {scheme.isActive ? (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="View Details"
                        onClick={() => { setSelectedWorkflow(scheme); setDetailOpen(true); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Configure Steps"
                        onClick={() => { setSelectedWorkflow(scheme); setStepsOpen(true); }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Edit"
                        onClick={() => { setSelectedWorkflow(scheme); setFormOpen(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <WorkflowFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        workflow={selectedWorkflow}
        onSave={(workflow) => {
          toast({
            title: selectedWorkflow ? "Workflow Updated" : "Workflow Created",
            description: `Workflow ${workflow.name} has been ${selectedWorkflow ? "updated" : "created"} successfully.`,
          });
        }}
      />

      {selectedWorkflow && (
        <>
          <WorkflowDetailDialog
            open={detailOpen}
            onOpenChange={setDetailOpen}
            workflow={selectedWorkflow}
          />
          <WorkflowStepsDialog
            open={stepsOpen}
            onOpenChange={setStepsOpen}
            workflow={selectedWorkflow}
          />
        </>
      )}
    </div>
  );
}
