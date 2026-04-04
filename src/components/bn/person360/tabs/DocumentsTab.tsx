/**
 * Person 360 — Documents/Evidence Tab
 * 
 * Source: bn_claim_evidence
 * Read-only — shows all documents submitted across all claims
 * Role visibility: Claims Officer, Supervisor, Medical Coordinator, Admin, Auditor
 */
import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileCheck2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import type { Person360Document } from '@/services/bn/person360Service';

const docStatusConfig: Record<string, { color: string; icon: any }> = {
  VERIFIED: { color: 'bg-emerald-500/15 text-emerald-700', icon: FileCheck2 },
  PENDING: { color: 'bg-amber-500/15 text-amber-700', icon: Clock },
  REJECTED: { color: 'bg-destructive/15 text-destructive', icon: XCircle },
  EXPIRED: { color: 'bg-amber-500/15 text-amber-700', icon: AlertTriangle },
};

interface DocumentsTabProps {
  documents: Person360Document[];
  isLoading?: boolean;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ documents, isLoading }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return documents;
    const q = search.toLowerCase();
    return documents.filter(d =>
      d.file_name.toLowerCase().includes(q) ||
      d.document_type.toLowerCase().includes(q) ||
      (d.claim_number || '').toLowerCase().includes(q)
    );
  }, [documents, search]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Claim #</TableHead>
              <TableHead>Document Type</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Verified By</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No documents found</TableCell></TableRow>
            ) : filtered.map(doc => {
              const cfg = docStatusConfig[doc.status] || docStatusConfig.PENDING;
              return (
                <TableRow key={doc.id}>
                  <TableCell className="font-mono">{doc.claim_number || '—'}</TableCell>
                  <TableCell>{doc.document_type.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="max-w-40 truncate">{doc.file_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cfg.color}>{doc.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDateForDisplay(doc.uploaded_at)}</TableCell>
                  <TableCell>{doc.verified_by || '—'}</TableCell>
                  <TableCell className="max-w-32 truncate">{doc.notes || '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} documents</p>
    </div>
  );
};
