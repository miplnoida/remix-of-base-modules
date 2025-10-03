import { useState } from 'react';
import { FileText, Grid3x3, List, Upload, Filter, Search, Save, Download, Share2, FileSignature, Tag, Archive, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  useLegalDocuments,
  useCreateDocument,
  useCreateDocumentVersion,
  useShareDocument,
  useUpdateDocumentESign,
  useToggleEvidence,
  useBulkUpdateDocuments,
  useSavedSearches,
  useSaveSearch,
  DocumentFilters,
} from '@/hooks/useLegalDocuments';
import { format } from 'date-fns';

const DOC_TYPES = ['Filings', 'Evidence', 'Notices', 'Orders', 'Correspondence', 'Internal'];
const ESIGN_STATUSES = ['Not Sent', 'Sent', 'Partially Signed', 'Fully Signed', 'Declined'];

export default function DocumentCenter() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [filters, setFilters] = useState<DocumentFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  
  // Dialogs
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [eSignOpen, setESignOpen] = useState(false);
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);

  const { data: documents, isLoading } = useLegalDocuments(filters);
  const { data: savedSearches } = useSavedSearches();
  const createDocument = useCreateDocument();
  const shareDocument = useShareDocument();
  const updateESign = useUpdateDocumentESign();
  const toggleEvidence = useToggleEvidence();
  const bulkUpdate = useBulkUpdateDocuments();
  const saveSearch = useSaveSearch();
  const createVersion = useCreateDocumentVersion();

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await createDocument.mutateAsync({
      case_id: formData.get('caseId'),
      name: formData.get('name'),
      type: formData.get('type'),
      confidential: formData.get('confidential') === 'on',
      file_path: '/placeholder/path', // In production, upload to storage
      uploaded_by: (await import('@/integrations/supabase/client')).supabase.auth.getUser().then(u => u.data.user?.id),
      size: '1.2 MB',
      checksum: crypto.randomUUID(),
    });
    
    setUploadOpen(false);
  };

  const handleShare = async (docId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await shareDocument.mutateAsync({
      documentId: docId,
      share: {
        expiresInHours: Number(formData.get('expiresInHours')),
        watermarkText: formData.get('watermark') as string,
        maxAccessCount: formData.get('maxAccessCount') ? Number(formData.get('maxAccessCount')) : undefined,
      },
    });
    
    setShareOpen(false);
  };

  const handleBulkTag = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tags = (formData.get('tags') as string).split(',').map(t => t.trim());
    
    await bulkUpdate.mutateAsync({
      ids: selectedDocs,
      updates: { tags },
    });
    
    setBulkTagOpen(false);
    setSelectedDocs([]);
  };

  const handleSaveSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await saveSearch.mutateAsync({
      name: formData.get('searchName') as string,
      filters,
      isDefault: formData.get('isDefault') === 'on',
    });
    
    setSaveSearchOpen(false);
  };

  const getDocTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Filings: 'bg-blue-500',
      Evidence: 'bg-green-500',
      Notices: 'bg-yellow-500',
      Orders: 'bg-purple-500',
      Correspondence: 'bg-orange-500',
      Internal: 'bg-gray-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const getESignColor = (status: string) => {
    const colors: Record<string, string> = {
      'Not Sent': 'secondary',
      'Sent': 'default',
      'Partially Signed': 'default',
      'Fully Signed': 'default',
      'Declined': 'destructive',
    };
    return colors[status] || 'secondary';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Center</h1>
          <p className="text-muted-foreground">Cross-case document management with advanced search</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Documents</DialogTitle>
                <DialogDescription>Upload one or more documents to a case</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <Label htmlFor="caseId">Case ID</Label>
                  <Input id="caseId" name="caseId" required />
                </div>
                <div>
                  <Label htmlFor="name">Document Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="type">Document Type</Label>
                  <Select name="type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="confidential" name="confidential" />
                  <Label htmlFor="confidential">Confidential</Label>
                </div>
                <div>
                  <Label htmlFor="file">File</Label>
                  <Input id="file" name="file" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.png" />
                </div>
                <Button type="submit" className="w-full">Upload</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Search Text (Content/OCR)</Label>
                <Input
                  placeholder="Search documents..."
                  value={filters.searchText || ''}
                  onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                />
              </div>
              <div>
                <Label>Document Types</Label>
                <Select
                  value={filters.docType?.[0] || ''}
                  onValueChange={(value) => setFilters({ ...filters, docType: value ? [value] : [] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    {DOC_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>eSign Status</Label>
                <Select
                  value={filters.eSignStatus?.[0] || ''}
                  onValueChange={(value) => setFilters({ ...filters, eSignStatus: value ? [value] : [] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    {ESIGN_STATUSES.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confidential"
                  checked={filters.confidential}
                  onCheckedChange={(checked) => setFilters({ ...filters, confidential: checked as boolean })}
                />
                <Label htmlFor="confidential">Confidential Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="evidence"
                  checked={filters.markedAsEvidence}
                  onCheckedChange={(checked) => setFilters({ ...filters, markedAsEvidence: checked as boolean })}
                />
                <Label htmlFor="evidence">Evidence Only</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setFilters({})}>Clear Filters</Button>
              <Button variant="outline" onClick={() => setSaveSearchOpen(true)}>
                <Save className="h-4 w-4 mr-2" />
                Save Search
              </Button>
              {savedSearches && savedSearches.length > 0 && (
                <Select onValueChange={(id) => {
                  const search = savedSearches.find(s => s.id === id);
                  if (search) setFilters(search.filters as DocumentFilters);
                }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Load saved search" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedSearches.map(search => (
                      <SelectItem key={search.id} value={search.id}>{search.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Toggles & Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Grid
          </Button>
        </div>

        {selectedDocs.length > 0 && (
          <div className="flex gap-2">
            <Badge variant="secondary">{selectedDocs.length} selected</Badge>
            <Button size="sm" variant="outline" onClick={() => setBulkTagOpen(true)}>
              <Tag className="h-4 w-4 mr-2" />
              Bulk Tag
            </Button>
            <Button size="sm" variant="outline">
              <Archive className="h-4 w-4 mr-2" />
              Bulk Export
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedDocs([])}>
              Clear Selection
            </Button>
          </div>
        )}
      </div>

      {/* Documents Display */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading documents...
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedDocs.length === documents?.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDocs(documents?.map(d => d.id) || []);
                      } else {
                        setSelectedDocs([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents?.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedDocs.includes(doc.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDocs([...selectedDocs, doc.id]);
                        } else {
                          setSelectedDocs(selectedDocs.filter(id => id !== doc.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{doc.name}</div>
                        {doc.confidential && <Badge variant="destructive" className="text-xs">Confidential</Badge>}
                        {doc.marked_as_evidence && <Badge className="text-xs ml-1">Evidence</Badge>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getDocTypeColor(doc.type)}>{doc.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="link" className="p-0 h-auto">
                      {doc.case?.number}
                    </Button>
                  </TableCell>
                  <TableCell>v{doc.version}</TableCell>
                  <TableCell>{doc.size}</TableCell>
                  <TableCell>{(doc.uploader as any)?.full_name || 'Unknown'}</TableCell>
                  <TableCell>{format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant={getESignColor(doc.esign_status || 'Not Sent') as any}>
                      {doc.esign_status || 'Not Sent'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setPreviewDoc(doc)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setPreviewDoc(doc);
                        setShareOpen(true);
                      }}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleEvidence.mutate({ id: doc.id, marked: !doc.marked_as_evidence })}
                      >
                        <Tag className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {documents?.map((doc) => (
            <Card key={doc.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Checkbox
                    checked={selectedDocs.includes(doc.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDocs([...selectedDocs, doc.id]);
                      } else {
                        setSelectedDocs(selectedDocs.filter(id => id !== doc.id));
                      }
                    }}
                  />
                  <Badge className={getDocTypeColor(doc.type)}>{doc.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium truncate">{doc.name}</div>
                  <div className="text-xs text-muted-foreground">{doc.case?.number}</div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {doc.confidential && <Badge variant="destructive" className="text-xs">Confidential</Badge>}
                  {doc.marked_as_evidence && <Badge className="text-xs">Evidence</Badge>}
                  <Badge variant="outline" className="text-xs">v{doc.version}</Badge>
                </div>
                <div className="flex gap-1 pt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setPreviewDoc(doc)}>
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Share2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <div className="aspect-[8.5/11] bg-muted rounded-md flex items-center justify-center">
                <FileText className="h-24 w-24 text-muted-foreground" />
                <p className="text-muted-foreground mt-4">PDF Preview</p>
              </div>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                <div>
                  <Label>Case</Label>
                  <p className="text-sm">{previewDoc?.case?.number}</p>
                </div>
                <Separator />
                <div>
                  <Label>Type</Label>
                  <Badge className={getDocTypeColor(previewDoc?.type || '')}>{previewDoc?.type}</Badge>
                </div>
                <div>
                  <Label>Version</Label>
                  <p className="text-sm">v{previewDoc?.version}</p>
                </div>
                <div>
                  <Label>Size</Label>
                  <p className="text-sm">{previewDoc?.size}</p>
                </div>
                <div>
                  <Label>Uploaded By</Label>
                  <p className="text-sm">{previewDoc?.uploader?.full_name}</p>
                </div>
                <div>
                  <Label>Uploaded</Label>
                  <p className="text-sm">{previewDoc && format(new Date(previewDoc.uploaded_at), 'PPP')}</p>
                </div>
                <div>
                  <Label>Checksum</Label>
                  <p className="text-xs font-mono">{previewDoc?.checksum?.substring(0, 16)}...</p>
                </div>
                {previewDoc?.tags && previewDoc.tags.length > 0 && (
                  <div>
                    <Label>Tags</Label>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {previewDoc.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Separator />
                <div className="space-y-2">
                  <Button className="w-full" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button className="w-full" size="sm" variant="outline">
                    <FileSignature className="h-4 w-4 mr-2" />
                    Send for eSign
                  </Button>
                  <Button className="w-full" size="sm" variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Create Share Link
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>Create a time-bound share link with watermark</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => previewDoc && handleShare(previewDoc.id, e)} className="space-y-4">
            <div>
              <Label htmlFor="expiresInHours">Expires In (hours)</Label>
              <Input id="expiresInHours" name="expiresInHours" type="number" defaultValue="24" required />
            </div>
            <div>
              <Label htmlFor="watermark">Watermark Text</Label>
              <Input id="watermark" name="watermark" placeholder="CONFIDENTIAL - DO NOT DISTRIBUTE" />
            </div>
            <div>
              <Label htmlFor="maxAccessCount">Max Access Count (optional)</Label>
              <Input id="maxAccessCount" name="maxAccessCount" type="number" placeholder="Unlimited" />
            </div>
            <Button type="submit" className="w-full">Create Share Link</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Save Search Dialog */}
      <Dialog open={saveSearchOpen} onOpenChange={setSaveSearchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current Search</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSearch} className="space-y-4">
            <div>
              <Label htmlFor="searchName">Search Name</Label>
              <Input id="searchName" name="searchName" required placeholder="e.g., Recent Evidence Files" />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="isDefault" name="isDefault" />
              <Label htmlFor="isDefault">Set as default search</Label>
            </div>
            <Button type="submit" className="w-full">Save Search</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Tag Dialog */}
      <Dialog open={bulkTagOpen} onOpenChange={setBulkTagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Tag Documents</DialogTitle>
            <DialogDescription>Add tags to {selectedDocs.length} selected documents</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulkTag} className="space-y-4">
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" name="tags" placeholder="urgent, reviewed, filed" required />
            </div>
            <Button type="submit" className="w-full">Apply Tags</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
