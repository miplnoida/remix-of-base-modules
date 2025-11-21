import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Settings, Eye } from "lucide-react";
import { workflowSchemes } from "@/services/mockData/systemAdminData";
import { useToast } from "@/hooks/use-toast";

export default function WorkflowSchemeList() {
  const { toast } = useToast();
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workflow Configuration</h1>
          <p className="text-muted-foreground">Configure approval workflows for all modules</p>
        </div>
        <Button onClick={() => toast({ title: "Create Workflow", description: "Create workflow dialog would open here" })}>
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
                        onClick={() => toast({ title: "View Workflow", description: `Viewing ${scheme.name}` })}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Configure Steps"
                        onClick={() => toast({ title: "Configure Steps", description: `Configuring steps for ${scheme.name}` })}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Edit"
                        onClick={() => toast({ title: "Edit Workflow", description: `Editing ${scheme.name}` })}
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
    </div>
  );
}
