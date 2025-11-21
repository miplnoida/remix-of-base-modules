import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Download, FileText, Upload } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const DocumentTemplates = () => {
  const applicationForms = [
    {
      code: "SB/EIB",
      name: "Claim for Sickness and Injury Benefit",
      category: "Application Form",
      version: "v3.2",
      lastUpdated: "Jan 2024",
      status: "Active"
    },
    {
      code: "MAT",
      name: "Maternity Benefit Application",
      category: "Application Form",
      version: "v2.1",
      lastUpdated: "Jan 2024",
      status: "Active"
    },
    {
      code: "SDB",
      name: "Claim for Survivor's/Death Benefit",
      category: "Application Form",
      version: "v2.8",
      lastUpdated: "Dec 2023",
      status: "Active"
    },
    {
      code: "AGE",
      name: "Age Pension/Grant Application",
      category: "Application Form",
      version: "v3.0",
      lastUpdated: "Jan 2024",
      status: "Active"
    },
    {
      code: "INV",
      name: "Invalidity Benefit Claim Form",
      category: "Application Form",
      version: "v2.5",
      lastUpdated: "Nov 2023",
      status: "Active"
    },
    {
      code: "FUN",
      name: "Funeral Grant Application",
      category: "Application Form",
      version: "v1.9",
      lastUpdated: "Jan 2024",
      status: "Active"
    },
    {
      code: "MED-EXP",
      name: "Claim for Medical/Travel Expenses",
      category: "Application Form",
      version: "v2.3",
      lastUpdated: "Dec 2023",
      status: "Active"
    },
  ];

  const supportingDocs = [
    {
      code: "LIFE-CERT",
      name: "Life Certificate",
      category: "Supporting Document",
      requiredFor: "All pensioners - Annual",
      version: "v1.5",
      status: "Active"
    },
    {
      code: "SCH-CERT",
      name: "School/College Certificate",
      category: "Supporting Document",
      requiredFor: "Survivors' benefit for students",
      version: "v1.3",
      status: "Active"
    },
    {
      code: "B1-EMP",
      name: "B1 Employer Information Request",
      category: "Supporting Document",
      requiredFor: "Contribution verification",
      version: "v2.0",
      status: "Active"
    },
    {
      code: "B1A-EMP",
      name: "B1A Supplementary Employer Info",
      category: "Supporting Document",
      requiredFor: "Additional wage verification",
      version: "v1.8",
      status: "Active"
    },
    {
      code: "MED-CERT",
      name: "Medical Certificate",
      category: "Supporting Document",
      requiredFor: "Sickness/Invalidity claims",
      version: "v2.1",
      status: "Active"
    },
    {
      code: "EFT-FORM",
      name: "Electronic Funds Transfer Form",
      category: "Payment Document",
      requiredFor: "Direct deposit setup",
      version: "v3.0",
      status: "Active"
    },
  ];

  const letterTemplates = [
    {
      code: "APPR-LTR",
      name: "Benefit Approval Letter",
      category: "Decision Letter",
      useCase: "Approved claims",
      language: "EN"
    },
    {
      code: "DENY-LTR",
      name: "Benefit Denial Letter",
      category: "Decision Letter",
      useCase: "Rejected claims with reasons",
      language: "EN"
    },
    {
      code: "INFO-REQ",
      name: "Request for Additional Information",
      category: "Action Required",
      useCase: "Incomplete applications",
      language: "EN"
    },
    {
      code: "SUSP-NOTIF",
      name: "Benefit Suspension Notice",
      category: "Status Change",
      useCase: "Temporary suspension",
      language: "EN"
    },
    {
      code: "TERM-NOTIF",
      name: "Benefit Termination Notice",
      category: "Status Change",
      useCase: "End of benefit period",
      language: "EN"
    },
    {
      code: "REVIEW-REM",
      name: "Review Reminder Letter",
      category: "Reminder",
      useCase: "Annual review due",
      language: "EN"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Document Templates & Forms</h1>
          <p className="text-muted-foreground mt-2">
            Manage application forms, supporting documents, and letter templates for all benefit types
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Upload New Template
        </Button>
      </div>

      <Tabs defaultValue="application-forms" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="application-forms">Application Forms</TabsTrigger>
          <TabsTrigger value="supporting-docs">Supporting Documents</TabsTrigger>
          <TabsTrigger value="letter-templates">Letter Templates</TabsTrigger>
          <TabsTrigger value="internal-forms">Internal Forms</TabsTrigger>
        </TabsList>

        <TabsContent value="application-forms">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Official Benefit Application Forms</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form Code</TableHead>
                    <TableHead>Form Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applicationForms.map((form, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono font-medium">{form.code}</TableCell>
                      <TableCell>{form.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{form.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{form.version}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{form.lastUpdated}</TableCell>
                      <TableCell>
                        <Badge variant="default">{form.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" title="Download PDF">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Edit Template">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="View">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Form Management Guidelines:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>All forms must be approved by Benefits Administration before activation</li>
                  <li>Version numbers increment with each update (major.minor format)</li>
                  <li>Previous versions are archived and accessible for historical claims</li>
                  <li>Forms can be downloaded as PDF or accessed via online portal</li>
                  <li>Templates support merge fields for auto-population of insured person data</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="supporting-docs">
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Supporting Documents & Certificates</h3>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Code</TableHead>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Required For</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportingDocs.map((doc, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono font-medium">{doc.code}</TableCell>
                      <TableCell>{doc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{doc.requiredFor}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{doc.version}</TableCell>
                      <TableCell>
                        <Badge variant="default">{doc.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="letter-templates">
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Internal Letter Templates</h3>
              <p className="text-sm text-muted-foreground">
                Templates for decision letters, notices, and communications with claimants
              </p>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Code</TableHead>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Use Case</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {letterTemplates.map((template, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono font-medium">{template.code}</TableCell>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{template.useCase}</TableCell>
                      <TableCell>{template.language}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" title="Preview">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-3">Available Merge Fields</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{'{{CLAIMANT_NAME}}'}</code>
                      <span className="text-muted-foreground">Full name</span>
                    </div>
                    <div className="flex justify-between">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{'{{SSN}}'}</code>
                      <span className="text-muted-foreground">Social Security Number</span>
                    </div>
                    <div className="flex justify-between">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{'{{BENEFIT_TYPE}}'}</code>
                      <span className="text-muted-foreground">Type of benefit</span>
                    </div>
                    <div className="flex justify-between">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{'{{CLAIM_ID}}'}</code>
                      <span className="text-muted-foreground">Claim reference number</span>
                    </div>
                    <div className="flex justify-between">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{'{{DECISION_DATE}}'}</code>
                      <span className="text-muted-foreground">Date of decision</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-2">
                  <h4 className="font-semibold mb-3">Template Standards</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Official letterhead with SSB logo</li>
                    <li>Clear subject line and reference number</li>
                    <li>Plain language for claimant understanding</li>
                    <li>Appeal rights information where applicable</li>
                    <li>Contact information for queries</li>
                  </ul>
                </Card>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="internal-forms">
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Internal Processing Forms</h3>
              <p className="text-sm text-muted-foreground">
                Forms used by staff for benefit processing, assessment, and decision-making
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Eligibility Assessment Form</h4>
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Internal checklist for verifying contribution requirements and eligibility criteria
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </Card>

                <Card className="p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Medical Assessment Form</h4>
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    For invalidity and employment injury disability assessments
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </Card>

                <Card className="p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Payment Authorization Form</h4>
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Approval and authorization for benefit payments to be processed
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </Card>

                <Card className="p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Benefit Review Form</h4>
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Annual or periodic review of ongoing benefits for continued eligibility
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentTemplates;
