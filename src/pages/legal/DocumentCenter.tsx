import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Grid3x3, List, Upload, Filter, Save, Download, Share2, FileSignature, Tag, Archive, Eye, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
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
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from '@/components/legal/grid';
import { LegalMatterWorkspaceBanner } from '@/components/legal/LegalMatterWorkspaceBanner';

const DOC_TYPES = ['Filings', 'Evidence', 'Notices', 'Orders', 'Correspondence', 'Internal'];
const ESIGN_STATUSES = ['Not Sent', 'Sent', 'Partially Signed', 'Fully Signed', 'Declined'];
const CASE_IDS = [
  'SSB/LGL/2024/001', 'SSB/LGL/2024/002', 'SSB/LGL/2024/003', 'SSB/LGL/2024/004', 'SSB/LGL/2024/005',
  'SSB/LGL/2023/001', 'SSB/LGL/2023/002', 'SSB/LGL/2023/003', 'SSB/LGL/2023/004', 'SSB/LGL/2023/005',
];

export default function DocumentCenter() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [filters, setFilters] = useState<DocumentFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [caseIdOpen, setCaseIdOpen] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);

  const { data: documents, isLoading } = useLegalDocuments(filters);
  const { data: savedSearches } = useSavedSearches();
  const createDocument = useCreateDocument();
  const shareDocument = useShareDocument();
  const toggleEvidence = useToggleEvidence();
  const bulkUpdate = useBulkUpdateDocuments();
  const saveSearch = useSaveSearch();

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createDocument.mutateAsync({
      case_id: formData.get('caseId'),
      name: formData.get('name'),
      type: formData.get('type'),
      confidential: formData.get('confidential') === 'on',
      file_path: '/placeholder/path',
      uploaded_by: supabase.auth.getUser().then(u => u.data.user?.id),
      size: '1.2 MB',
      checksum: crypto.randomUUID(),
    });
    setSelectedCaseId('');
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
    await bulkUpdate.mutateAsync({ ids: selectedDocs, updates: { tags } });
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
      Filings: 'bg-blue-500', Evidence: 'bg-green-500', Notices: 'bg-yellow-500',
      Orders: 'bg-purple-500', Correspondence: 'bg-orange-500', Internal: 'bg-gray-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const columns: LgColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: 'name', header: 'Name', meta: { label: 'Name', pinLeft: true, width: 220 },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="flex gap-1 mt-0.5">
              {row.original.confidential && <Badge variant="destructive" className="text-xs">Confidential</Badge>}
              {row.original.marked_as_evidence && <Badge className="text-xs ml-1">Evidence</Badge>}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'type', header: 'Type', meta: { label: 'Type', width: 130 },
      cell: ({ getValue }) => <Badge className={getDocTypeColor(getValue<string>())}>{getValue<string>()}</Badge>,
    },
    {
      accessorKey: 'case', header: 'Case', meta: { label: 'Case', width: 150 },
      cell: ({ getValue }) => (getValue<any>()?.number ?? '—'),
    },
    { accessorKey: 'version', header: 'Version', meta: { label: 'Version', width: 90 }, cell: ({ getValue }) => `v${getValue<number>()}` },
    { accessorKey: 'size', header: 'Size', meta: { label: 'Size', width: 90 } },
    {
      accessorKey: 'uploaded_at', header: 'Uploaded', meta: { label: 'Uploaded', width: 120 },
      cell: ({ getValue }) => { try { return format(new Date(getValue<string>()), 'MMM d, yyyy'); } catch { return '—'; } },
    },
    {
      accessorKey: 'esign_status', header: 'eSign Status', meta: { label: 'eSign Status', width: 150 },
      cell: ({ getValue }) => {
        const v = getValue<string>() || 'Not Sent';
        return <LgStatusBadge status={v.replace(/\s+/g, '_').toUpperCase()} label={v} size="sm" />;
      },
    },
  ], []);

  // UUID detector — only show workspace banner for real lg_case ids,
  // not the legacy case-code strings still surfaced by mocks.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedCaseId);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Document Center</h1>
          <p className="text-muted-foreground">Cross-case document management with advanced search</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={uploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open) setSelectedCaseId(''); }}>
            <DialogTrigger asChild>
              <Button><Upload className="h-4 w-4 mr-2" />Upload Documents</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Documents</DialogTitle>
                <DialogDescription>Upload one or more documents to a case</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <Label htmlFor="caseId">Case ID</Label>
                  <Popover open={caseIdOpen} onOpenChange={setCaseIdOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={caseIdOpen} className="w-full justify-between">
                        {selectedCaseId || "Select case ID..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search case ID..." />
                        <CommandList>
                          <CommandEmpty>No case found.</CommandEmpty>
                          <CommandGroup>
                            {CASE_IDS.map((caseId) => (
                              <CommandItem key={caseId} value={caseId} onSelect={(v) => { setSelectedCaseId(v === selectedCaseId ? "" : v); setCaseIdOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", selectedCaseId === caseId ? "opacity-100" : "opacity-0")} />
                                {caseId}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <input type="hidden" name="caseId" value={selectedCaseId} required />
                </div>
                <div><Label htmlFor="name">Document Name</Label><Input id="name" name="name" required /></div>
                <div>
                  <Label htmlFor="type">Document Type</Label>
                  <Select name="type" required>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="confidential" name="confidential" />
                  <Label htmlFor="confidential">Confidential</Label>
                </div>
                <div><Label htmlFor="file">File</Label><Input id="file" name="file" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.png" /></div>
                <Button type="submit" className="w-full">Upload</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />Filters
          </Button>
        </div>
      </div>

      {/* Unified Legal Matter Workspace banner — shown when a real case is selected */}
      {isUuid && (
        <LegalMatterWorkspaceBanner matterRef={{ kind: "case", id: selectedCaseId }} compact />
      )}


      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Advanced Filters</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Search Text (Content/OCR)</Label>
                <Input placeholder="Search documents..." value={filters.searchText || ''} onChange={(e) => setFilters({ ...filters, searchText: e.target.value })} />
              </div>
              <div>
                <Label>Document Types</Label>
                <Select value={filters.docType?.[0] || 'all'} onValueChange={(v) => setFilters({ ...filters, docType: v === 'all' ? [] : [v] })}>
                  <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>eSign Status</Label>
                <Select value={filters.eSignStatus?.[0] || 'all'} onValueChange={(v) => setFilters({ ...filters, eSignStatus: v === 'all' ? [] : [v] })}>
                  <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {ESIGN_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="confidential-filter" checked={filters.confidential} onCheckedChange={(c) => setFilters({ ...filters, confidential: c as boolean })} />
                <Label htmlFor="confidential-filter">Confidential Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="evidence-filter" checked={filters.markedAsEvidence} onCheckedChange={(c) => setFilters({ ...filters, markedAsEvidence: c as boolean })} />
                <Label htmlFor="evidence-filter">Evidence Only</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setFilters({})}>Clear Filters</Button>
              <Button variant="outline" onClick={() => setSaveSearchOpen(true)}><Save className="h-4 w-4 mr-2" />Save Search</Button>
              {savedSearches && savedSearches.length > 0 && (
                <Select onValueChange={(id) => { const s = savedSearches.find(s => s.id === id); if (s) setFilters(s.filters as DocumentFilters); }}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Load saved search" /></SelectTrigger>
                  <SelectContent>{savedSearches.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}><List className="h-4 w-4 mr-2" />List</Button>
          <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')}><Grid3x3 className="h-4 w-4 mr-2" />Grid</Button>
        </div>
        {selectedDocs.length > 0 && (
          <div className="flex gap-2">
            <Badge variant="secondary">{selectedDocs.length} selected</Badge>
            <Button size="sm" variant="outline" onClick={() => setBulkTagOpen(true)}><Tag className="h-4 w-4 mr-2" />Bulk Tag</Button>
            <Button size="sm" variant="outline"><Archive className="h-4 w-4 mr-2" />Bulk Export</Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedDocs([])}>Clear Selection</Button>
          </div>
        )}
      </div>

      {/* List View — LgDataGrid */}
      {viewMode === 'list' && (
        <LgDataGrid
          id="lg.documents"
          columns={columns}
          data={documents ?? []}
          isLoading={isLoading}
          searchPlaceholder="Search documents by name, type, case…"
          defaultSort={[{ id: 'uploaded_at', desc: true }]}
          toolbarFilters={[
            {
              key: 'docType', label: 'Doc Type', value: filters.docType?.[0] ?? '',
              onChange: (v) => setFilters({ ...filters, docType: v ? [v] : [] }),
              options: DOC_TYPES.map((t) => ({ value: t, label: t })),
            },
            {
              key: 'eSignStatus', label: 'eSign Status', value: filters.eSignStatus?.[0] ?? '',
              onChange: (v) => setFilters({ ...filters, eSignStatus: v ? [v] : [] }),
              options: ESIGN_STATUSES.map((s) => ({ value: s, label: s })),
            },
          ]}
          rowActions={[
            ...buildLgRowActions<any>({ onView: (r) => setPreviewDoc(r) }),
            { key: 'download', label: 'Download', icon: <Download className="h-3.5 w-3.5" />, onClick: () => {} },
            {
              key: 'share', label: 'Share', icon: <Share2 className="h-3.5 w-3.5" />,
              onClick: (r) => { setPreviewDoc(r); setShareOpen(true); },
            },
            {
              key: 'evidence', label: 'Toggle Evidence', icon: <Tag className="h-3.5 w-3.5" />,
              onClick: (r) => toggleEvidence.mutate({ id: r.id, marked: !r.marked_as_evidence }),
            },
          ]}
          bulkActions={[
            { key: 'tag', label: 'Bulk Tag', onClick: (rows) => { setSelectedDocs(rows.map((r: any) => r.id)); setBulkTagOpen(true); } },
            { key: 'export', label: 'Bulk Export', onClick: () => {} },
          ]}
          emptyMessage="No documents found. Upload documents to get started."
          exportFilename="legal-documents"
        />
      )}

      {/* Grid View — card layout */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {documents?.map((doc: any) => (
            <Card key={doc.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Checkbox
                    checked={selectedDocs.includes(doc.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedDocs([...selectedDocs, doc.id]);
                      else setSelectedDocs(selectedDocs.filter(id => id !== doc.id));
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
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setPreviewDoc(doc)}><Eye className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" className="flex-1"><Download className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" className="flex-1"><Share2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>{previewDoc?.name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <div className="aspect-[8.5/11] bg-muted rounded-md flex items-center justify-center">
                <FileText className="h-24 w-24 text-muted-foreground" />
              </div>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                <div><Label>Case</Label><p className="text-sm">{previewDoc?.case?.number}</p></div>
                <Separator />
                <div><Label>Type</Label><Badge className={getDocTypeColor(previewDoc?.type || '')}>{previewDoc?.type}</Badge></div>
                <div><Label>Version</Label><p className="text-sm">v{previewDoc?.version}</p></div>
                <div><Label>Size</Label><p className="text-sm">{previewDoc?.size}</p></div>
                <div><Label>Uploaded By</Label><p className="text-sm">{previewDoc?.uploader?.full_name}</p></div>
                <div><Label>Uploaded</Label><p className="text-sm">{previewDoc && format(new Date(previewDoc.uploaded_at), 'PPP')}</p></div>
                <div><Label>Checksum</Label><p className="text-xs font-mono">{previewDoc?.checksum?.substring(0, 16)}...</p></div>
                {previewDoc?.tags && previewDoc.tags.length > 0 && (
                  <div>
                    <Label>Tags</Label>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {previewDoc.tags.map((tag: string) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                    </div>
                  </div>
                )}
                <Separator />
                <div className="space-y-2">
                  <Button className="w-full" size="sm"><Download className="h-4 w-4 mr-2" />Download</Button>
                  <Button className="w-full" size="sm" variant="outline"><FileSignature className="h-4 w-4 mr-2" />Send for eSign</Button>
                  <Button className="w-full" size="sm" variant="outline"><Share2 className="h-4 w-4 mr-2" />Create Share Link</Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share Document</DialogTitle><DialogDescription>Create a time-bound share link with watermark</DialogDescription></DialogHeader>
          <form onSubmit={(e) => previewDoc && handleShare(previewDoc.id, e)} className="space-y-4">
            <div><Label htmlFor="expiresInHours">Expires In (hours)</Label><Input id="expiresInHours" name="expiresInHours" type="number" defaultValue="24" required /></div>
            <div><Label htmlFor="watermark">Watermark Text</Label><Input id="watermark" name="watermark" placeholder="CONFIDENTIAL - DO NOT DISTRIBUTE" /></div>
            <div><Label htmlFor="maxAccessCount">Max Access Count (optional)</Label><Input id="maxAccessCount" name="maxAccessCount" type="number" placeholder="Unlimited" /></div>
            <Button type="submit" className="w-full">Create Share Link</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Save Search Dialog */}
      <Dialog open={saveSearchOpen} onOpenChange={setSaveSearchOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save Current Search</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveSearch} className="space-y-4">
            <div><Label htmlFor="searchName">Search Name</Label><Input id="searchName" name="searchName" required placeholder="e.g., Recent Evidence Files" /></div>
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
          <DialogHeader><DialogTitle>Bulk Tag Documents</DialogTitle><DialogDescription>Add tags to {selectedDocs.length} selected documents</DialogDescription></DialogHeader>
          <form onSubmit={handleBulkTag} className="space-y-4">
            <div><Label htmlFor="tags">Tags (comma-separated)</Label><Input id="tags" name="tags" placeholder="urgent, reviewed, filed" required /></div>
            <Button type="submit" className="w-full">Apply Tags</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
