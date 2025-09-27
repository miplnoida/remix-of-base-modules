import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Scan, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Edit,
  Send,
  Printer,
  Search,
  Filter
} from 'lucide-react';

// Mock pending intake items
const mockIntakeItems = [
  {
    id: 'INT001',
    type: 'MAIL',
    description: 'Sickness benefit application with medical certificate',
    receivedDate: '2024-01-20',
    scanOperator: 'intake_user1',
    priority: 'NORMAL',
    documentCount: 3,
    status: 'PENDING_SCAN'
  },
  {
    id: 'INT002',
    type: 'WALK_IN',
    description: 'Maternity benefit application - walk-in submission',
    receivedDate: '2024-01-20',
    scanOperator: 'intake_user2',
    priority: 'HIGH',
    documentCount: 2,
    status: 'PENDING_INDEX'
  },
  {
    id: 'INT003',
    type: 'ONLINE',
    description: 'Employment injury claim - online submission',
    receivedDate: '2024-01-19',
    scanOperator: 'auto_system',
    priority: 'URGENT',
    documentCount: 5,
    status: 'READY_FOR_REVIEW'
  }
];

export const IntakeConsole: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [ssn, setSsn] = useState('');
  const [benefitType, setBenefitType] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [notes, setNotes] = useState('');

  const handleStartScan = () => {
    console.log('Starting document scan...');
  };

  const handleIndexDocument = () => {
    console.log('Indexing document...');
  };

  const handleRunPreCheck = () => {
    console.log('Running pre-check wizard...');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'READY_FOR_REVIEW':
        return 'default';
      case 'PENDING_INDEX':
        return 'secondary';
      case 'PENDING_SCAN':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Intake Console</h1>
          <p className="text-muted-foreground">Document capture, scanning, and indexing</p>
        </div>
        <div className="flex space-x-2">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            New Batch
          </Button>
          <Button variant="outline">
            <Scan className="h-4 w-4 mr-2" />
            Start Scanner
          </Button>
        </div>
      </div>

      <Tabs defaultValue="queue" className="w-full">
        <TabsList>
          <TabsTrigger value="queue">Intake Queue</TabsTrigger>
          <TabsTrigger value="scan">Document Scanning</TabsTrigger>
          <TabsTrigger value="index">Auto-Indexing</TabsTrigger>
          <TabsTrigger value="precheck">Pre-Check Wizard</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Intake Queue</CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockIntakeItems.map((item) => (
                  <div 
                    key={item.id} 
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedItem?.id === item.id ? 'bg-muted border-primary' : ''
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">{item.id}</h3>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.documentCount} documents • Received: {new Date(item.receivedDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getPriorityBadgeVariant(item.priority)}>
                          {item.priority}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {item.status.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedItem && (
            <Card>
              <CardHeader>
                <CardTitle>Item Details - {selectedItem.id}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Description</Label>
                      <p className="text-sm">{selectedItem.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type</Label>
                        <p className="text-sm">{selectedItem.type}</p>
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <p className="text-sm">{selectedItem.priority}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Received Date</Label>
                        <p className="text-sm">{new Date(selectedItem.receivedDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label>Document Count</Label>
                        <p className="text-sm">{selectedItem.documentCount}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button className="w-full" onClick={handleStartScan}>
                      <Scan className="h-4 w-4 mr-2" />
                      Start Scanning
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleIndexDocument}>
                      <Edit className="h-4 w-4 mr-2" />
                      Index Documents
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleRunPreCheck}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Run Pre-Check
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Scanning</CardTitle>
              <CardDescription>Scan and capture physical documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input 
                    id="batchNumber"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="Enter batch number"
                  />
                </div>
                <div>
                  <Label htmlFor="scanMode">Scan Mode</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scan mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="color">Color</SelectItem>
                      <SelectItem value="grayscale">Grayscale</SelectItem>
                      <SelectItem value="bw">Black & White</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Scan className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Scanner Ready</p>
                <p className="text-muted-foreground mb-4">
                  Place documents in scanner and click start
                </p>
                <Button onClick={handleStartScan}>
                  <Scan className="h-4 w-4 mr-2" />
                  Start Scanning
                </Button>
              </div>

              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  Scanner Status: <span className="text-green-600 font-medium">Ready</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Pages Scanned: <span className="font-medium">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="index" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Indexing</CardTitle>
              <CardDescription>Automatically classify and index scanned documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="ssn">SSN (from OCR)</Label>
                  <Input 
                    id="ssn"
                    value={ssn}
                    onChange={(e) => setSsn(e.target.value)}
                    placeholder="Auto-detected SSN"
                  />
                </div>
                <div>
                  <Label htmlFor="benefitType">Benefit Type</Label>
                  <Select value={benefitType} onValueChange={setBenefitType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detected type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SICKNESS">Sickness</SelectItem>
                      <SelectItem value="MATERNITY">Maternity</SelectItem>
                      <SelectItem value="EMPLOYMENT_INJURY">Employment Injury</SelectItem>
                      <SelectItem value="FUNERAL_GRANT">Funeral Grant</SelectItem>
                      <SelectItem value="AGE_PENSION">Age Pension</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detected" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPLICATION">Application Form</SelectItem>
                      <SelectItem value="MEDICAL_CERT">Medical Certificate</SelectItem>
                      <SelectItem value="ID_COPY">ID Copy</SelectItem>
                      <SelectItem value="BANK_INFO">Bank Information</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Indexing Notes</Label>
                <Textarea 
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about the indexing..."
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Review & Correct
                </Button>
                <Button onClick={handleIndexDocument}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Indexing
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="precheck" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pre-Check Wizard</CardTitle>
              <CardDescription>Automated validation and pre-processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Document Completeness Check</p>
                      <p className="text-sm text-muted-foreground">All required documents present</p>
                    </div>
                  </div>
                  <Badge variant="default">PASSED</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">SSN Validation</p>
                      <p className="text-sm text-muted-foreground">Valid SSN format and checksum</p>
                    </div>
                  </div>
                  <Badge variant="default">PASSED</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">Duplicate Check</p>
                      <p className="text-sm text-muted-foreground">Similar claim found from 2023</p>
                    </div>
                  </div>
                  <Badge variant="secondary">WARNING</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Contribution History</p>
                      <p className="text-sm text-muted-foreground">Sufficient contribution weeks found</p>
                    </div>
                  </div>
                  <Badge variant="default">PASSED</Badge>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button onClick={handleRunPreCheck}>
                  <Send className="h-4 w-4 mr-2" />
                  Send to Processing
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};