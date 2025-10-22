import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Eye, Edit, Trash2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function BemaTemplateManagement() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const templates = [
    { 
      id: 1, 
      name: "Arrears Statement", 
      category: "statements", 
      lastModified: "2025-01-15",
      variables: ["{{employer_name}}", "{{total_amount}}", "{{period_list}}"]
    },
    { 
      id: 2, 
      name: "Audit Notice", 
      category: "notices", 
      lastModified: "2025-01-10",
      variables: ["{{employer_name}}", "{{audit_date}}", "{{inspector_name}}"]
    },
    { 
      id: 3, 
      name: "Payment Plan Agreement", 
      category: "agreements", 
      lastModified: "2025-01-20",
      variables: ["{{employer_name}}", "{{total_debt}}", "{{installment_amount}}"]
    },
    { 
      id: 4, 
      name: "Legal Notice", 
      category: "notices", 
      lastModified: "2025-01-18",
      variables: ["{{employer_name}}", "{{outstanding_amount}}", "{{deadline}}"]
    },
  ];

  const handleSaveTemplate = () => {
    toast.success("Template saved successfully");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Management</h1>
          <p className="text-muted-foreground">
            Create and manage document templates for letters, notices, and statements
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Templates Library</CardTitle>
              <CardDescription>Select a template to edit</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="statements">Statements</TabsTrigger>
                  <TabsTrigger value="notices">Notices</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="space-y-2 mt-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{template.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {template.lastModified}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="statements">
                  <p className="text-sm text-muted-foreground">Statement templates</p>
                </TabsContent>
                <TabsContent value="notices">
                  <p className="text-sm text-muted-foreground">Notice templates</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-4">
          {selectedTemplate ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedTemplate.name}</CardTitle>
                      <CardDescription>
                        Last modified: {selectedTemplate.lastModified}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button variant="outline" size="sm">
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </Button>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      defaultValue={selectedTemplate.name}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      defaultValue={selectedTemplate.category}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject Line (for emails)</Label>
                    <Input
                      id="subject"
                      placeholder="e.g., Outstanding Contribution Statement - {{period}}"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Template Content</Label>
                    <Textarea
                      id="content"
                      rows={15}
                      className="font-mono text-sm"
                      defaultValue={`Dear {{employer_name}},

This is to inform you that our records indicate outstanding contributions for your organization.

Period: {{period_list}}
Total Amount Due: $\{{total_amount}}
Penalties: $\{{penalty_amount}}
Interest: $\{{interest_amount}}

Grand Total: $\{{grand_total}}

Please remit payment within 14 days to avoid further penalties.

Sincerely,
Social Security Board
Saint Kitts and Nevis`}
                    />
                  </div>

                  <Button onClick={handleSaveTemplate} className="w-full">
                    Save Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Available Variables</CardTitle>
                  <CardDescription>
                    Click to copy merge field to clipboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "{{employer_name}}",
                      "{{employer_id}}",
                      "{{total_amount}}",
                      "{{period_list}}",
                      "{{penalty_amount}}",
                      "{{interest_amount}}",
                      "{{grand_total}}",
                      "{{today_date}}",
                      "{{due_date}}",
                      "{{inspector_name}}",
                      "{{audit_date}}",
                      "{{case_number}}",
                    ].map((variable) => (
                      <Button
                        key={variable}
                        variant="outline"
                        size="sm"
                        className="justify-start font-mono text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(variable);
                          toast.success("Copied to clipboard");
                        }}
                      >
                        {variable}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Select a template from the list to edit
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
