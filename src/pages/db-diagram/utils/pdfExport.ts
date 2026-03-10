import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
}

/**
 * Compact single-page-oriented PDF export.
 * Packs summary header, visual overview, data dictionary (multi-column),
 * and relationships all as tightly as possible.
 */
export function exportDbDiagramToPdf({
  module, tables, relationships, columnsMap,
  pageSize = 'a2',
  orientation = 'landscape',
}: ExportData) {
  const doc = new jsPDF({ orientation, unit: 'mm', format: pageSize });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 10; // margin
  const moduleName = module?.module_name || 'Enterprise';

  // ─── SECTION 1: Compact header + summary + overview — ALL ON PAGE 1 ───

  // Title bar
  doc.setFillColor('#009B4C');
  doc.rect(0, 0, pageW, 14, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#ffffff');
  doc.text(`DB Diagram: ${moduleName}`, M, 9);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}  |  ${pageSize.toUpperCase()} ${orientation}  |  Tables: ${tables.length}  |  Relationships: ${relationships.length}`, pageW - M, 9, { align: 'right' });
  doc.setTextColor('#000000');

  // Category legend — horizontal, compact
  let lx = M;
  const ly = 19;
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  Object.entries(TABLE_CATEGORIES).forEach(([, val]) => {
    doc.setFillColor(val.color);
    doc.rect(lx, ly - 2.5, 3, 3, 'F');
    doc.text(val.label, lx + 4, ly);
    lx += doc.getTextWidth(val.label) + 7;
  });

  // ─── Visual overview: table boxes with relationship lines ───
  const overviewStartY = ly + 5;
  const availW = pageW - M * 2;
  const availH = pageH - overviewStartY - M - 2;

  // Calculate grid dimensions to fit ALL tables on this page
  const totalTables = tables.length;
  // Try to fill the available area optimally
  const aspectRatio = availW / availH;
  let cols = Math.max(2, Math.round(Math.sqrt(totalTables * aspectRatio)));
  let rows = Math.ceil(totalTables / cols);

  // Ensure it fits vertically; if not, add more columns
  const gapX = 4;
  const gapY = 4;
  let boxW = (availW - (cols - 1) * gapX) / cols;
  let boxH = (availH - (rows - 1) * gapY) / rows;

  // Cap box dimensions for readability
  boxW = Math.min(boxW, 120);
  boxH = Math.min(boxH, 35);

  // Recalculate cols/rows with capped sizes
  cols = Math.max(2, Math.floor((availW + gapX) / (boxW + gapX)));
  rows = Math.ceil(totalTables / cols);
  
  // If it still overflows vertically, shrink box height
  const totalRowH = rows * boxH + (rows - 1) * gapY;
  if (totalRowH > availH) {
    boxH = Math.max(12, (availH - (rows - 1) * gapY) / rows);
  }

  // Center the grid
  const gridW = cols * boxW + (cols - 1) * gapX;
  const startX = M + (availW - gridW) / 2;
  const startY = overviewStartY;

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

  const tablePositions: Record<string, { x: number; y: number; w: number; h: number; cx: number; cy: number }> = {};

  sortedTables.forEach((table, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = startX + col * (boxW + gapX);
    const y = startY + row * (boxH + gapY);

    const cat = TABLE_CATEGORIES[table.table_category] || TABLE_CATEGORIES.module_primary;
    const colCount = columnsMap[table.table_name]?.length || 0;

    // Box
    doc.setDrawColor(cat.color);
    doc.setLineWidth(0.4);
    doc.setFillColor('#ffffff');
    doc.roundedRect(x, y, boxW, boxH, 1.5, 1.5, 'FD');

    // Header band
    const hdrH = Math.min(6, boxH * 0.35);
    doc.setFillColor(cat.color);
    doc.roundedRect(x, y, boxW, hdrH, 1.5, 1.5, 'F');
    doc.rect(x, y + hdrH - 1.5, boxW, 1.5, 'F');

    // Table name
    const fs = Math.max(4, Math.min(6, boxW / 16));
    doc.setFontSize(fs);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#ffffff');
    const maxChars = Math.floor(boxW / (fs * 0.42));
    const name = table.table_name.length > maxChars ? table.table_name.slice(0, maxChars - 1) + '…' : table.table_name;
    doc.text(name, x + 1.5, y + hdrH - 1.2);

    // Info line
    doc.setTextColor('#555555');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(Math.max(3.5, fs - 1.5));
    if (boxH > 14) {
      doc.text(`${colCount} cols${table.is_shared ? ' | SHARED' : ''}`, x + 1.5, y + hdrH + 3);
    }
    if (boxH > 20 && table.primary_key_summary) {
      doc.setFontSize(3.5);
      doc.setTextColor('#999999');
      const pkText = table.primary_key_summary.length > maxChars ? table.primary_key_summary.slice(0, maxChars - 1) + '…' : table.primary_key_summary;
      doc.text(`PK: ${pkText}`, x + 1.5, y + hdrH + 6.5);
    }

    tablePositions[table.id] = { x, y, w: boxW, h: boxH, cx: x + boxW / 2, cy: y + boxH / 2 };
    doc.setTextColor('#000000');
  });

  // Draw relationship lines — connect from nearest edges, not just top/bottom
  doc.setLineWidth(0.2);
  relationships.forEach(rel => {
    const src = tablePositions[rel.source_table_id];
    const tgt = tablePositions[rel.target_table_id];
    if (!src || !tgt) return;

    if (rel.is_inferred) {
      doc.setDrawColor('#f59e0b');
      doc.setLineDashPattern([1, 0.8], 0);
    } else {
      doc.setDrawColor('#6366f1');
      doc.setLineDashPattern([], 0);
    }

    // Connect from nearest edges
    const dx = tgt.cx - src.cx;
    const dy = tgt.cy - src.cy;
    let sx: number, sy: number, tx: number, ty: number;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      sx = dx > 0 ? src.x + src.w : src.x;
      sy = src.cy;
      tx = dx > 0 ? tgt.x : tgt.x + tgt.w;
      ty = tgt.cy;
    } else {
      // Vertical connection
      sx = src.cx;
      sy = dy > 0 ? src.y + src.h : src.y;
      tx = tgt.cx;
      ty = dy > 0 ? tgt.y : tgt.y + tgt.h;
    }

    doc.line(sx, sy, tx, ty);

    // Small arrowhead
    const angle = Math.atan2(ty - sy, tx - sx);
    const a = 1.5;
    doc.line(tx, ty, tx - a * Math.cos(angle - 0.4), ty - a * Math.sin(angle - 0.4));
    doc.line(tx, ty, tx - a * Math.cos(angle + 0.4), ty - a * Math.sin(angle + 0.4));
  });
  doc.setLineDashPattern([], 0);

  // ─── SECTION 2: Data Dictionary — compact multi-column autoTable ───
  // Place all table schemas in a dense format, multiple tables side-by-side if page is wide enough
  doc.addPage(pageSize, orientation);
  const dictPageW = doc.internal.pageSize.getWidth();
  const dictPageH = doc.internal.pageSize.getHeight();

  // Title
  doc.setFillColor('#333333');
  doc.rect(0, 0, dictPageW, 10, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#ffffff');
  doc.text(`${moduleName} — Data Dictionary (${tables.length} tables, ${Object.values(columnsMap).reduce((s, c) => s + c.length, 0)} columns)`, M, 7);
  doc.setTextColor('#000000');

  // Use two-column layout for data dictionary if page is wide enough (> 400mm)
  const useTwoCols = dictPageW > 350;
  const colWidth = useTwoCols ? (dictPageW - M * 3) / 2 : dictPageW - M * 2;
  let dictY = 14;
  let dictCol = 0; // 0 = left, 1 = right

  const getColX = (c: number) => M + c * (colWidth + M);

  sortedTables.forEach((table) => {
    const cols_data = columnsMap[table.table_name] || [];
    // Estimate height: header(6) + rows * 3.5 + head(4) + padding(4)
    const estHeight = 6 + 4 + cols_data.length * 3.5 + 4;

    // Check if fits on current column
    if (dictY + Math.min(estHeight, 40) > dictPageH - M) {
      if (useTwoCols && dictCol === 0) {
        // Move to right column
        dictCol = 1;
        dictY = 14;
      } else {
        // New page
        doc.addPage(pageSize, orientation);
        dictY = M;
        dictCol = 0;
      }
    }

    const cat = TABLE_CATEGORIES[table.table_category] || TABLE_CATEGORIES.module_primary;
    const leftX = getColX(dictCol);

    // Table header bar
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
        head: [['Column', 'Type', 'N', 'Key']],
        body: cols_data.map(c => [
          c.column_name,
          c.data_type,
          c.is_nullable ? '✓' : '✗',
          (c.is_primary_key ? 'PK' : '') + (c.is_foreign_key ? 'FK' : ''),
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

  // ─── SECTION 3: Relationships table — compact ───
  // Check if relationships fit on remaining space, otherwise new page
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

  // ─── Footer on all pages ───
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
