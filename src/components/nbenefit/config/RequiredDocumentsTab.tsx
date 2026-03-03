import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit } from 'lucide-react';
import { BenefitRuleSet, RequiredDocument } from '@/types/benefitRulesConfig';

interface RequiredDocumentsTabProps {
  benefitRule: BenefitRuleSet;
  onUpdate: (rule: BenefitRuleSet) => void;
}

export default function RequiredDocumentsTab({ benefitRule, onUpdate }: RequiredDocumentsTabProps) {
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [newDocument, setNewDocument] = useState<Partial<RequiredDocument>>({
    documentType: 'MEDICAL_CERTIFICATE',
    documentName: '',
    isMandatory: true,
    whenRequired: 'AT_CLAIM',
  });

  const addDocument = () => {
    const doc: RequiredDocument = {
      documentId: `DOC${benefitRule.requiredDocuments.length + 1}`,
      documentType: newDocument.documentType || 'MEDICAL_CERTIFICATE',
      documentName: newDocument.documentName || '',
      isMandatory: newDocument.isMandatory ?? true,
      whenRequired: newDocument.whenRequired || 'AT_CLAIM',
      frequencyMonths: newDocument.frequencyMonths,
      condition: newDocument.condition,
      notes: newDocument.notes,
    };

    onUpdate({
      ...benefitRule,
      requiredDocuments: [...benefitRule.requiredDocuments, doc],
    });

    setIsAddDocOpen(false);
    setNewDocument({
      documentType: 'MEDICAL_CERTIFICATE',
      documentName: '',
      isMandatory: true,
      whenRequired: 'AT_CLAIM',
    });
  };

  const deleteDocument = (index: number) => {
    const updatedDocs = [...benefitRule.requiredDocuments];
    updatedDocs.splice(index, 1);
    onUpdate({
      ...benefitRule,
      requiredDocuments: updatedDocs,
    });
  };

  const getWhenRequiredBadge = (whenRequired: string) => {
    const colors: Record<string, string> = {
      AT_CLAIM: 'bg-secondary/10 text-secondary-foreground',
      BEFORE_FIRST_PAYMENT: 'bg-primary/10 text-primary',
      PERIODIC: 'bg-accent/30 text-accent-foreground',
      RENEWAL: 'bg-muted text-foreground',
      CONDITIONAL: 'bg-accent/20 text-accent-foreground',
    };
    return colors[whenRequired] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Required Documents</CardTitle>
              <CardDescription>
                Configure which documents are required and when they must be submitted
              </CardDescription>
            </div>
            <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Required Document</DialogTitle>
                  <DialogDescription>Configure a new document requirement</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Document Type</Label>
                      <Select
                        value={newDocument.documentType}
                        onValueChange={value =>
                          setNewDocument({ ...newDocument, documentType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEDICAL_CERTIFICATE">Medical Certificate</SelectItem>
                          <SelectItem value="EMPLOYER_VERIFICATION">Employer Verification</SelectItem>
                          <SelectItem value="BIRTH_CERTIFICATE">Birth Certificate</SelectItem>
                          <SelectItem value="MARRIAGE_CERTIFICATE">Marriage Certificate</SelectItem>
                          <SelectItem value="DEATH_CERTIFICATE">Death Certificate</SelectItem>
                          <SelectItem value="BANK_DETAILS">Bank Account Details</SelectItem>
                          <SelectItem value="LIFE_CERTIFICATE">Life Certificate</SelectItem>
                          <SelectItem value="RESIDENCE_PROOF">Proof of Residence</SelectItem>
                          <SelectItem value="SCHOOL_ATTENDANCE">School Attendance Letter</SelectItem>
                          <SelectItem value="MEDICAL_BOARD_REPORT">Medical Board Report</SelectItem>
                          <SelectItem value="INCOME_PROOF">Proof of Income</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Document Name</Label>
                      <Input
                        value={newDocument.documentName}
                        onChange={e =>
                          setNewDocument({ ...newDocument, documentName: e.target.value })
                        }
                        placeholder="e.g., Doctor Medical Certificate"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>When Required</Label>
                      <Select
                        value={newDocument.whenRequired}
                        onValueChange={value =>
                          setNewDocument({ ...newDocument, whenRequired: value as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AT_CLAIM">At Claim</SelectItem>
                          <SelectItem value="BEFORE_FIRST_PAYMENT">Before First Payment</SelectItem>
                          <SelectItem value="PERIODIC">Periodic</SelectItem>
                          <SelectItem value="RENEWAL">At Renewal</SelectItem>
                          <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(newDocument.whenRequired === 'PERIODIC' ||
                      newDocument.whenRequired === 'RENEWAL') && (
                      <div className="space-y-2">
                        <Label>Frequency (Months)</Label>
                        <Input
                          type="number"
                          value={newDocument.frequencyMonths || ''}
                          onChange={e =>
                            setNewDocument({
                              ...newDocument,
                              frequencyMonths: parseInt(e.target.value),
                            })
                          }
                          placeholder="e.g., 12"
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-2 md:col-span-2">
                      <Checkbox
                        id="isMandatory"
                        checked={newDocument.isMandatory}
                        onCheckedChange={value =>
                          setNewDocument({ ...newDocument, isMandatory: !!value })
                        }
                      />
                      <Label htmlFor="isMandatory">This document is mandatory</Label>
                    </div>

                    {newDocument.whenRequired === 'CONDITIONAL' && (
                      <div className="space-y-2 md:col-span-2">
                        <Label>Condition</Label>
                        <Input
                          value={newDocument.condition || ''}
                          onChange={e =>
                            setNewDocument({ ...newDocument, condition: e.target.value })
                          }
                          placeholder="e.g., If age > 18, If married"
                        />
                      </div>
                    )}

                    <div className="space-y-2 md:col-span-2">
                      <Label>Notes</Label>
                      <Input
                        value={newDocument.notes || ''}
                        onChange={e => setNewDocument({ ...newDocument, notes: e.target.value })}
                        placeholder="Additional notes about this document requirement"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDocOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addDocument}>Add Document</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {benefitRule.requiredDocuments.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed p-12 text-center">
              <p className="text-muted-foreground">No document requirements defined yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Click "Add Document" to configure required documents for this benefit.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Mandatory</TableHead>
                  <TableHead>When Required</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benefitRule.requiredDocuments.map((doc, index) => (
                  <TableRow key={doc.documentId}>
                    <TableCell className="font-medium">
                      {doc.documentType.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>{doc.documentName}</TableCell>
                    <TableCell>
                      <Badge variant={doc.isMandatory ? 'default' : 'secondary'}>
                        {doc.isMandatory ? 'Mandatory' : 'Optional'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getWhenRequiredBadge(doc.whenRequired)} variant="secondary">
                        {doc.whenRequired.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {doc.frequencyMonths
                        ? `Every ${doc.frequencyMonths} months`
                        : doc.frequencyYears
                          ? `Every ${doc.frequencyYears} years`
                          : '—'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {doc.condition || '—'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{doc.notes || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteDocument(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
