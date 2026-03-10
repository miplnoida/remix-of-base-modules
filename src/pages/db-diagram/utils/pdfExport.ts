import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import {
  DbModule, DbTable, DbRelationship, DbColumn,
  TABLE_CATEGORIES,
} from '@/services/dbDiagramService';

interface ExportData {
  module: DbModule | null;
  tables: DbTable[];
  relationships: DbRelationship[];
  columnsMap: Record<string, DbColumn[]>;
  pageSize?: string;
  orientation?: 'portrait' | 'landscape';
  zoomLevel?: number;
  diagramElement?: HTMLElement | null;
}

/**
 * Captures the ACTUAL on-screen diagram via html2canvas,
 * then appends a compact data dictionary + relationships.
 */
export async function exportDbDiagramToPdf({
  module, tables, relationships, columnsMap,
  pageSize = 'a2',
  orientation = 'landscape',
  zoomLevel = 75,
  diagramElement,
}: ExportData) {
  const doc = new jsPDF({ orientation, unit: 'mm', format: pageSize });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 10;
  const moduleName = module?.module_name || 'Enterprise';

  // ─── PAGE 1: Capture the actual on-screen diagram ───
  if (diagramElement) {
    // Capture the live ReactFlow diagram exactly as the user sees it
    const canvas = await html2canvas(diagramElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      // Capture the full scrollable content
      scrollX: 0,
      scrollY: 0,
      windowWidth: diagramElement.scrollWidth,
      windowHeight: diagramElement.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgW = canvas.width;
    const imgH = canvas.height;

    // Title bar
    doc.setFillColor('#009B4C');
    doc.rect(0, 0, pageW, 12, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#ffffff');
    doc.text(`DB Diagram: ${moduleName}`, M, 8);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated: ${new Date().toLocaleString()}  |  Tables: ${tables.length}  |  Relationships: ${relationships.length}`,
      pageW - M, 8, { align: 'right' }
    );
    doc.setTextColor('#000000');

    // Fit the captured diagram into the remaining page area
    const diagramTopY = 14;
    const availW = pageW - M * 2;
    const availH = pageH - diagramTopY - M - 4;

    // Apply user-chosen zoom: zoomLevel 100 = fit-to-page, lower = shrink more to fit more content
    const zoomFactor = zoomLevel / 100;
    const scaleW = availW / (imgW * zoomFactor);
    const scaleH = availH / (imgH * zoomFactor);
    const scale = Math.min(scaleW, scaleH) * zoomFactor;

    const renderW = imgW * scale;
    const renderH = imgH * scale;
    const offsetX = M + (availW - renderW) / 2;

    doc.addImage(imgData, 'PNG', offsetX, diagramTopY, renderW, renderH);
  } else {
    // Fallback: draw simplified overview if no DOM element available
    drawSimplifiedOverview(doc, { tables, relationships, columnsMap, moduleName, pageW, pageH, M });
  }

  // ─── PAGE 2+: Data Dictionary ───
  doc.addPage(pageSize, orientation);
  const dictPageW = doc.internal.pageSize.getWidth();
  const dictPageH = doc.internal.pageSize.getHeight();

  // Title
  doc.setFillColor('#333333');
  doc.rect(0, 0, dictPageW, 10, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#ffffff');
  const totalCols = Object.values(columnsMap).reduce((s, c) => s + c.length, 0);
  doc.text(`${moduleName} — Data Dictionary (${tables.length} tables, ${totalCols} columns)`, M, 7);
  doc.setTextColor('#000000');

  // Category legend — compact horizontal
  let lx = M;
  const ly = 14;
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  Object.entries(TABLE_CATEGORIES).forEach(([, val]) => {
    doc.setFillColor(val.color);
    doc.rect(lx, ly - 2, 2.5, 2.5, 'F');
    doc.text(val.label, lx + 3.5, ly);
    lx += doc.getTextWidth(val.label) + 6;
  });

  const catOrder: Record<string, number> = {
    core_master: 0, module_primary: 1, module_secondary: 2,
    shared_transaction: 3, bridge_junction: 4, reference_lookup: 5,
    audit_log: 6, temporary_work: 7, integration_staging: 8,
  };
  const sortedTables = [...tables].sort((a, b) => {
    const aO = catOrder[a.table_category] ?? 5;
    const bO = catOrder[b.table_category] ?? 5;
    return aO - bO || a.table_name.localeCompare(b.table_name);
  });

  // Two-column layout for wide pages
  const useTwoCols = dictPageW > 350;
  const colWidth = useTwoCols ? (dictPageW - M * 3) / 2 : dictPageW - M * 2;
  let dictY = 18;
  let dictCol = 0;

  const getColX = (c: number) => M + c * (colWidth + M);

  sortedTables.forEach((table) => {
    const cols_data = columnsMap[table.table_name] || [];
    const estHeight = 6 + 4 + cols_data.length * 3.5 + 4;

    if (dictY + Math.min(estHeight, 40) > dictPageH - M) {
      if (useTwoCols && dictCol === 0) {
        dictCol = 1;
        dictY = 18;
      } else {
        doc.addPage(pageSize, orientation);
        dictY = M;
        dictCol = 0;
      }
    }

    const cat = TABLE_CATEGORIES[table.table_category] || TABLE_CATEGORIES.module_primary;
    const leftX = getColX(dictCol);

    doc.setFillColor(cat.color);
    doc.roundedRect(leftX, dictY, colWidth, 5, 0.8, 0.8, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#ffffff');
    doc.text(`${table.table_name}  (${cols_data.length} cols)${table.is_shared ? '  [SHARED]' : ''}`, leftX + 2, dictY + 3.5);
    doc.setTextColor('#000000');
    dictY += 5.5;

    if (cols_data.length > 0) {
      autoTable(doc, {
        startY: dictY,
        margin: { left: leftX, right: dictPageW - leftX - colWidth },
        tableWidth: colWidth,
        head: [['Column', 'Type', 'Null', 'Key']],
        body: cols_data.map(c => [
          c.column_name,
          c.data_type,
          c.is_nullable ? '✓' : '✗',
          (c.is_primary_key ? 'PK ' : '') + (c.is_foreign_key ? 'FK' : ''),
        ]),
        styles: { fontSize: 5, cellPadding: 0.8, lineWidth: 0.1 },
        headStyles: { fillColor: [80, 80, 80], fontSize: 5, cellPadding: 1 },
        columnStyles: {
          0: { font: 'courier', cellWidth: colWidth * 0.42 },
          1: { font: 'courier', cellWidth: colWidth * 0.30 },
          2: { halign: 'center', cellWidth: colWidth * 0.08 },
          3: { halign: 'center', cellWidth: colWidth * 0.12, fontStyle: 'bold' },
        },
        theme: 'grid',
        alternateRowStyles: { fillColor: [250, 250, 250] },
      });
      dictY = (doc as any).lastAutoTable.finalY + 3;
    } else {
      doc.setFontSize(5);
      doc.setFont('helvetica', 'italic');
      doc.text('No column data', leftX + 2, dictY + 2);
      dictY += 5;
    }
  });

  // ─── Relationships ───
  const relEstH = 10 + relationships.length * 3.5;
  if (dictY + Math.min(relEstH, 30) > dictPageH - M || dictCol === 1) {
    doc.addPage(pageSize, orientation);
    dictY = M;
  } else {
    dictY += 5;
  }

  const relPageW = doc.internal.pageSize.getWidth();
  doc.setFillColor('#6366f1');
  doc.roundedRect(M, dictY, relPageW - M * 2, 6, 1, 1, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#ffffff');
  doc.text(`Relationships (${relationships.length})`, M + 3, dictY + 4);
  doc.setTextColor('#000000');
  dictY += 7;

  if (relationships.length > 0) {
    const tableNameMap = new Map(tables.map(t => [t.id, t.table_name]));

    autoTable(doc, {
      startY: dictY,
      margin: { left: M, right: M },
      head: [['Source Table', 'Column', '→', 'Target Table', 'Column', 'Type', 'FK?']],
      body: relationships.map(r => [
        tableNameMap.get(r.source_table_id) || '?',
        r.source_column,
        '→',
        tableNameMap.get(r.target_table_id) || '?',
        r.target_column,
        r.relationship_type,
        r.is_physical_fk ? 'Yes' : 'Inf.',
      ]),
      styles: { fontSize: 5.5, cellPadding: 1, lineWidth: 0.1 },
      headStyles: { fillColor: [99, 102, 241], fontSize: 5.5, cellPadding: 1.2 },
      columnStyles: { 2: { cellWidth: 5, halign: 'center' } },
      theme: 'grid',
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  // ─── Page numbers ───
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(5.5);
    doc.setTextColor(150);
    doc.text(
      `Page ${i}/${totalPages}  |  ${moduleName}  |  ${new Date().toLocaleDateString()}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 4,
      { align: 'center' }
    );
  }

  const filename = `DB_Diagram_${moduleName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/** Fallback simplified overview when html2canvas can't capture the diagram */
function drawSimplifiedOverview(
  doc: jsPDF,
  { tables, relationships, columnsMap, moduleName, pageW, pageH, M }:
  { tables: DbTable[]; relationships: DbRelationship[]; columnsMap: Record<string, DbColumn[]>; moduleName: string; pageW: number; pageH: number; M: number }
) {
  doc.setFillColor('#009B4C');
  doc.rect(0, 0, pageW, 12, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#ffffff');
  doc.text(`DB Diagram: ${moduleName}`, M, 8);
  doc.setTextColor('#000000');

  const availW = pageW - M * 2;
  const availH = pageH - 24 - M;
  const aspectRatio = availW / availH;
  let cols = Math.max(2, Math.round(Math.sqrt(tables.length * aspectRatio)));
  const rows = Math.ceil(tables.length / cols);
  const gapX = 4, gapY = 4;
  let boxW = Math.min(90, (availW - (cols - 1) * gapX) / cols);
  let boxH = Math.min(30, (availH - (rows - 1) * gapY) / rows);
  cols = Math.max(2, Math.floor((availW + gapX) / (boxW + gapX)));
  const totalRowH = Math.ceil(tables.length / cols) * boxH + (Math.ceil(tables.length / cols) - 1) * gapY;
  if (totalRowH > availH) boxH = Math.max(12, (availH - (Math.ceil(tables.length / cols) - 1) * gapY) / Math.ceil(tables.length / cols));

  const gridW = cols * boxW + (cols - 1) * gapX;
  const startX = M + (availW - gridW) / 2;
  const startY = 20;

  const catOrder: Record<string, number> = {
    core_master: 0, module_primary: 1, module_secondary: 2,
    shared_transaction: 3, bridge_junction: 4, reference_lookup: 5,
    audit_log: 6, temporary_work: 7, integration_staging: 8,
  };
  const sorted = [...tables].sort((a, b) => (catOrder[a.table_category] ?? 5) - (catOrder[b.table_category] ?? 5) || a.table_name.localeCompare(b.table_name));
  const positions: Record<string, { cx: number; cy: number; x: number; y: number; w: number; h: number }> = {};

  sorted.forEach((table, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = startX + col * (boxW + gapX);
    const y = startY + row * (boxH + gapY);
    const cat = TABLE_CATEGORIES[table.table_category] || TABLE_CATEGORIES.module_primary;

    doc.setDrawColor(cat.color);
    doc.setLineWidth(0.4);
    doc.setFillColor('#ffffff');
    doc.roundedRect(x, y, boxW, boxH, 1.5, 1.5, 'FD');

    const hdrH = Math.min(6, boxH * 0.35);
    doc.setFillColor(cat.color);
    doc.roundedRect(x, y, boxW, hdrH, 1.5, 1.5, 'F');
    doc.rect(x, y + hdrH - 1.5, boxW, 1.5, 'F');

    const fs = Math.max(4, Math.min(6, boxW / 16));
    doc.setFontSize(fs);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#ffffff');
    const maxC = Math.floor(boxW / (fs * 0.42));
    doc.text(table.table_name.length > maxC ? table.table_name.slice(0, maxC - 1) + '…' : table.table_name, x + 1.5, y + hdrH - 1.2);
    doc.setTextColor('#555555');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(Math.max(3.5, fs - 1.5));
    if (boxH > 14) doc.text(`${columnsMap[table.table_name]?.length || 0} cols`, x + 1.5, y + hdrH + 4);
    doc.setTextColor('#000000');

    positions[table.id] = { x, y, w: boxW, h: boxH, cx: x + boxW / 2, cy: y + boxH / 2 };
  });

  doc.setLineWidth(0.2);
  relationships.forEach(rel => {
    const src = positions[rel.source_table_id];
    const tgt = positions[rel.target_table_id];
    if (!src || !tgt) return;
    doc.setDrawColor(rel.is_inferred ? '#f59e0b' : '#6366f1');
    if (rel.is_inferred) doc.setLineDashPattern([1, 0.8], 0);
    else doc.setLineDashPattern([], 0);
    const dx = tgt.cx - src.cx, dy = tgt.cy - src.cy;
    let sx: number, sy: number, tx: number, ty: number;
    if (Math.abs(dx) > Math.abs(dy)) { sx = dx > 0 ? src.x + src.w : src.x; sy = src.cy; tx = dx > 0 ? tgt.x : tgt.x + tgt.w; ty = tgt.cy; }
    else { sx = src.cx; sy = dy > 0 ? src.y + src.h : src.y; tx = tgt.cx; ty = dy > 0 ? tgt.y : tgt.y + tgt.h; }
    doc.line(sx, sy, tx, ty);
    const angle = Math.atan2(ty - sy, tx - sx);
    doc.line(tx, ty, tx - 1.5 * Math.cos(angle - 0.4), ty - 1.5 * Math.sin(angle - 0.4));
    doc.line(tx, ty, tx - 1.5 * Math.cos(angle + 0.4), ty - 1.5 * Math.sin(angle + 0.4));
  });
  doc.setLineDashPattern([], 0);
}
