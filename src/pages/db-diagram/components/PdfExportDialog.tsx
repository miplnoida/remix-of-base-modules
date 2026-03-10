import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileDown } from 'lucide-react';

export interface PdfExportSettings {
  pageSize: string;
  orientation: 'portrait' | 'landscape';
  zoomLevel: number;
}

const ZOOM_LEVELS = [
  { value: 25, label: '25% – Ultra compact (most tables on one page)' },
  { value: 50, label: '50% – Compact overview' },
  { value: 75, label: '75% – Balanced (recommended)' },
  { value: 100, label: '100% – Full size (as on screen)' },
  { value: 150, label: '150% – Enlarged detail' },
];

const PAGE_SIZES = [
  { value: 'a4', label: 'A4 (210 × 297 mm)' },
  { value: 'a3', label: 'A3 (297 × 420 mm)' },
  { value: 'a2', label: 'A2 (420 × 594 mm)' },
  { value: 'a1', label: 'A1 (594 × 841 mm)' },
  { value: 'a0', label: 'A0 (841 × 1189 mm)' },
  { value: 'letter', label: 'Letter (8.5 × 11 in)' },
  { value: 'legal', label: 'Legal (8.5 × 14 in)' },
  { value: 'tabloid', label: 'Tabloid (11 × 17 in)' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onExport: (settings: PdfExportSettings) => void;
  isExporting: boolean;
  tableCount: number;
}

export function PdfExportDialog({ open, onClose, onExport, isExporting, tableCount }: Props) {
  // Default to landscape + larger page for many tables
  const defaultSize = tableCount > 20 ? 'a1' : tableCount > 10 ? 'a2' : tableCount > 5 ? 'a3' : 'legal';
  const defaultZoom = tableCount > 20 ? 25 : tableCount > 10 ? 50 : 75;
  const [pageSize, setPageSize] = useState(defaultSize);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [zoomLevel, setZoomLevel] = useState(defaultZoom);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Export DB Diagram to PDF
          </DialogTitle>
          <DialogDescription>
            Choose page size and orientation for the exported PDF. Larger sizes show more tables in a single view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Page Size */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Page Size</Label>
            <Select value={pageSize} onValueChange={setPageSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(ps => (
                  <SelectItem key={ps.value} value={ps.value}>{ps.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {tableCount} tables to export. For best results with many tables, use A1 or A0.
            </p>
          </div>

          {/* Orientation */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Orientation</Label>
            <RadioGroup
              value={orientation}
              onValueChange={(v) => setOrientation(v as 'portrait' | 'landscape')}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="landscape" id="landscape" />
                <Label htmlFor="landscape" className="text-sm cursor-pointer">Landscape (recommended)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="portrait" id="portrait" />
                <Label htmlFor="portrait" className="text-sm cursor-pointer">Portrait</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Zoom Level */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Diagram Zoom / Scale</Label>
            <Select value={String(zoomLevel)} onValueChange={(v) => setZoomLevel(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZOOM_LEVELS.map(z => (
                  <SelectItem key={z.value} value={String(z.value)}>{z.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Lower zoom fits more tables on one page. Use 25–50% for large modules.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>Cancel</Button>
          <Button onClick={() => onExport({ pageSize, orientation, zoomLevel })} disabled={isExporting}>
            {isExporting ? (
              <>
                <FileDown className="h-4 w-4 mr-1 animate-bounce" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-1" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
