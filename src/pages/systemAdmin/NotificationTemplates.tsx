import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Copy, Eye } from "lucide-react";
import { notificationTemplates } from "@/services/mockData/notificationData";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NotificationTemplates() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("All");
  const [channelFilter, setChannelFilter] = useState<string>("All");

  const filteredTemplates = notificationTemplates.filter(template => {
    const matchesSearch = 
      template.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.bodyText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = moduleFilter === "All" || template.module === moduleFilter;
    const matchesChannel = channelFilter === "All" || template.channel === channelFilter;
    return matchesSearch && matchesModule && matchesChannel;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notification Templates</h1>
          <p className="text-muted-foreground">Manage reusable notification message templates</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{notificationTemplates.length}</div>
            <p className="text-sm text-muted-foreground">Total Templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {notificationTemplates.filter(t => t.isActive).length}
            </div>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {notificationTemplates.filter(t => t.channel === 'Email').length}
            </div>
            <p className="text-sm text-muted-foreground">Email Templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {notificationTemplates.filter(t => t.channel === 'SMS').length}
            </div>
            <p className="text-sm text-muted-foreground">SMS Templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Modules</SelectItem>
                <SelectItem value="Compliance">Compliance</SelectItem>
                <SelectItem value="Benefits">Benefits</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
                <SelectItem value="InternalAudit">Internal Audit</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Channels</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="Push">Push</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Subject/Preview</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.templateId}>
                  <TableCell className="font-medium">{template.templateName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.module}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{template.channel}</Badge>
                  </TableCell>
                  <TableCell className="uppercase text-sm">{template.languageCode}</TableCell>
                  <TableCell className="max-w-md truncate text-sm">
                    {template.subject || template.bodyText.substring(0, 60) + '...'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">v{template.versionNo}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={template.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {template.lastModifiedOn 
                      ? new Date(template.lastModifiedOn).toLocaleDateString()
                      : new Date(template.createdOn).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast({ title: "View Template", description: template.templateName })}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast({ title: "Edit Template", description: template.templateName })}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast({ title: "Clone Template", description: `Cloning ${template.templateName}` })}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast({ title: "Delete Template", description: template.templateName, variant: "destructive" })}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Template Parameters Help */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Available Template Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold mb-2">Common Parameters:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><code>{'{'}EmployerName{'}'}</code> - Employer name</li>
                <li><code>{'{'}InsuredPersonName{'}'}</code> - Insured person name</li>
                <li><code>{'{'}Date{'}'}</code> - Current date</li>
                <li><code>{'{'}AmountXCD{'}'}</code> - Amount in XCD</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">Compliance Parameters:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><code>{'{'}Period{'}'}</code> - C3 period</li>
                <li><code>{'{'}DueDate{'}'}</code> - Due date</li>
                <li><code>{'{'}DaysOverdue{'}'}</code> - Days overdue</li>
                <li><code>{'{'}CaseNumber{'}'}</code> - Case number</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">Benefits Parameters:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><code>{'{'}ClaimNumber{'}'}</code> - Claim number</li>
                <li><code>{'{'}BenefitType{'}'}</code> - Benefit type</li>
                <li><code>{'{'}ApprovedAmount{'}'}</code> - Approved amount</li>
                <li><code>{'{'}PaymentDate{'}'}</code> - Payment date</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
