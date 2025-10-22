import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function BemaRoleManagement() {
  const roles = [
    { id: 1, name: "Compliance Manager", users: 3, description: "Full access to all modules" },
    { id: 2, name: "Supervisor", users: 8, description: "Approve workplans and cases" },
    { id: 3, name: "Legal Officer", users: 5, description: "Manage legal actions and waivers" },
    { id: 4, name: "Inspector", users: 24, description: "Field work and audits" },
    { id: 5, name: "Clerical Staff", users: 12, description: "Data entry and document management" },
  ];

  const permissions = [
    {
      module: "Dashboard",
      permissions: ["View KPIs", "Export Reports", "Filter Data"]
    },
    {
      module: "Registrations",
      permissions: ["Create Registration", "Edit Registration", "Approve Registration", "Delete Registration"]
    },
    {
      module: "C3 Filing",
      permissions: ["Create C3", "Validate C3", "Raise Query", "Post C3", "Delete C3"]
    },
    {
      module: "Arrears",
      permissions: ["View Ledger", "Generate Statement", "Create Payment Plan", "Escalate to Legal"]
    },
    {
      module: "Audits",
      permissions: ["Create Audit", "Assign Inspector", "Review Findings", "Approve Penalties", "Close Audit"]
    },
    {
      module: "Legal",
      permissions: ["View Cases", "Create Legal Action", "Approve Waiver", "Close Case"]
    },
    {
      module: "Admin",
      permissions: ["Manage Roles", "Edit Rules", "Manage Templates", "View Audit Log"]
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role & Permission Management</h1>
          <p className="text-muted-foreground">
            Configure user roles and access permissions (RBAC)
          </p>
        </div>
        <Button 
          className="gap-2"
          onClick={() => toast.success("New role creation form will appear here")}
        >
          <Plus className="h-4 w-4" />
          New Role
        </Button>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions Matrix</TabsTrigger>
          <TabsTrigger value="users">User Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Roles</CardTitle>
              <CardDescription>
                Manage roles and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Shield className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{role.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {role.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">{role.users} users</Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toast.info(`Editing role: ${role.name}`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => toast.error(`Cannot delete role: ${role.name}`)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
              <CardDescription>
                Configure permissions for each role across modules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {permissions.map((module, i) => (
                  <div key={i} className="space-y-3">
                    <h3 className="font-medium">{module.module}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                      {module.permissions.map((permission, j) => (
                        <div key={j} className="flex items-center space-x-2">
                          <Checkbox id={`${i}-${j}`} />
                          <label
                            htmlFor={`${i}-${j}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {permission}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Role Assignments</CardTitle>
              <CardDescription>
                Assign roles to users in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "John Smith", role: "Compliance Manager", email: "john.smith@ssb.gov.kn" },
                  { name: "Sarah Johnson", role: "Inspector", email: "sarah.johnson@ssb.gov.kn" },
                  { name: "Mike Williams", role: "Supervisor", email: "mike.williams@ssb.gov.kn" },
                  { name: "Emma Davis", role: "Legal Officer", email: "emma.davis@ssb.gov.kn" },
                  { name: "David Brown", role: "Clerical Staff", email: "david.brown@ssb.gov.kn" },
                ].map((user, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge>{user.role}</Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toast.info(`Changing role for ${user.name}`)}
                      >
                        Change Role
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
