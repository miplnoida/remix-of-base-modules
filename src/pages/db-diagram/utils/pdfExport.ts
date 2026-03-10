import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DbModule, DbTable, DbRelationship, DbColumn,
  TABLE_CATEGORIES, shortDataType
} from '@/services/dbDiagramService';

interface ExportData {
  module: DbModule | null;
  tables: DbTable[];
  relationships: DbRelationship[];
  columnsMap: Record<string, DbColumn[]>;
  pageSize?: string;
  orientation?: 'portrait' | 'landscape';
}

export function exportDbDiagramToPdf({
  module, tables, relationships, columnsMap,
  pageSize = 'a2',
  orientation = 'landscape',
}: ExportData) {
  const doc = new jsPDF({ orientation, unit: 'mm', format: pageSize });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const moduleName = module?.module_name || 'Enterprise';

  // === PAGE 1: Cover & Summary ===
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(`DB Diagram: ${moduleName}`, pageW / 2, 40, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, 52, { align: 'center' });
  doc.text(`Page Size: ${pageSize.toUpperCase()} ${orientation}`, pageW / 2, 60, { align: 'center' });

  const fkCount = relationships.filter(r => r.is_physical_fk).length;
  const inferredCount = relationships.filter(r => r.is_inferred).length;
  const sharedCount = tables.filter(t => t.is_shared).length;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, 80);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const summaryLines = [
    `Total Tables: ${tables.length}`,
    `Shared Tables: ${sharedCount}`,
    `Physical FK Relationships: ${fkCount}`,
    `Inferred Relationships: ${inferredCount}`,
    `Module: ${moduleName}`,
    `Description: ${module?.description || 'N/A'}`,
    `Version: ${module?.current_version_no || 0}`,
  ];
  summaryLines.forEach((line, i) => {
    doc.text(line, margin, 92 + i * 7);
  });

  // Category legend
  let legendY = 92 + summaryLines.length * 7 + 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Table Categories:', margin, legendY);
  legendY += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  Object.entries(TABLE_CATEGORIES).forEach(([key, val]) => {
    doc.setFillColor(val.color);
    doc.rect(margin, legendY - 3, 4, 4, 'F');
    doc.text(`  ${val.label}`, margin + 6, legendY);
    legendY += 6;
  });

  // === PAGE 2: Visual Overview ===
  doc.addPage(pageSize, orientation);
  const overviewPageW = doc.internal.pageSize.getWidth();
  const overviewPageH = doc.internal.pageSize.getHeight();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  doc.text(`${moduleName} — Table Relationship Overview`, overviewPageW / 2, margin + 5, { align: 'center' });

  // Calculate optimal box size based on available space and table count
  const availW = overviewPageW - margin * 2;
  const availH = overviewPageH - margin * 2 - 20;
  const cols = Math.max(3, Math.min(8, Math.ceil(Math.sqrt(tables.length * 1.5))));
  const rows = Math.ceil(tables.length / cols);
  const gapX = 8;
  const gapY = 8;
  const boxW = Math.min(90, (availW - (cols - 1) * gapX) / cols);
  const boxH_base = Math.min(30, (availH - (rows - 1) * gapY) / rows);
  const startX = margin + (availW - cols * boxW - (cols - 1) * gapX) / 2;
  const startY = margin + 20;

  const tablePositions: Record<string, { x: number; y: number; w: number; h: number }> = {};

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

  let currentOverviewPage = 0;
  sortedTables.forEach((table, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const pageRow = row - currentOverviewPage * Math.floor(availH / (boxH_base + gapY));

    let x = startX + col * (boxW + gapX);
    let y = startY + pageRow * (boxH_base + gapY);

    if (y + boxH_base > overviewPageH - margin) {
      doc.addPage(pageSize, orientation);
      currentOverviewPage++;
      y = startY;
    }

    const cat = TABLE_CATEGORIES[table.table_category] || TABLE_CATEGORIES.module_primary;

    // Draw box
    doc.setDrawColor(cat.color);
    doc.setLineWidth(0.5);
    doc.setFillColor('#ffffff');
    doc.roundedRect(x, y, boxW, boxH_base, 2, 2, 'FD');

    // Color header
    const headerH = Math.min(8, boxH_base * 0.3);
    doc.setFillColor(cat.color);
    doc.roundedRect(x, y, boxW, headerH, 2, 2, 'F');
    doc.rect(x, y + headerH - 2, boxW, 2, 'F');

    // Table name
    const fontSize = Math.min(7, boxW / 14);
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#ffffff');
    const maxChars = Math.floor(boxW / (fontSize * 0.45));
    const displayName = table.table_name.length > maxChars
      ? table.table_name.slice(0, maxChars - 2) + '..'
      : table.table_name;
    doc.text(displayName, x + 2, y + headerH - 2);

    // Info below header
    doc.setTextColor('#333333');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(Math.max(5, fontSize - 1.5));
    const colCount = columnsMap[table.table_name]?.length || 0;
    const infoY = y + headerH + 4;
    doc.text(`${cat.label} | ${colCount} cols`, x + 2, infoY);

    if (table.primary_key_summary && boxH_base > 20) {
      doc.setFontSize(5);
      doc.setTextColor('#888888');
      doc.text(`PK: ${table.primary_key_summary}`, x + 2, infoY + 4);
    }

    tablePositions[table.id] = { x, y, w: boxW, h: boxH_base };
    doc.setTextColor('#000000');
  });

  // Draw relationship lines on overview
  doc.setLineWidth(0.25);
  relationships.forEach(rel => {
    const src = tablePositions[rel.source_table_id];
    const tgt = tablePositions[rel.target_table_id];
    if (!src || !tgt) return;

    if (rel.is_inferred) {
      doc.setDrawColor('#f59e0b');
      doc.setLineDashPattern([1, 1], 0);
    } else {
      doc.setDrawColor('#6366f1');
      doc.setLineDashPattern([], 0);
    }

    const sx = src.x + src.w / 2;
    const sy = src.y + src.h;
    const tx = tgt.x + tgt.w / 2;
    const ty = tgt.y;

    doc.line(sx, sy, tx, ty);

    const angle = Math.atan2(ty - sy, tx - sx);
    const arrowLen = 2;
    doc.line(tx, ty, tx - arrowLen * Math.cos(angle - 0.4), ty - arrowLen * Math.sin(angle - 0.4));
    doc.line(tx, ty, tx - arrowLen * Math.cos(angle + 0.4), ty - arrowLen * Math.sin(angle + 0.4));
  });
  doc.setLineDashPattern([], 0);

  // === DETAILED TABLE SCHEMAS ===
  doc.addPage(pageSize, orientation);
  const detailPageW = doc.internal.pageSize.getWidth();
  const detailPageH = doc.internal.pageSize.getHeight();

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  doc.text(`${moduleName} — Detailed Table Schemas (Data Dictionary)`, margin, margin + 5);

  let currentY = margin + 15;

  sortedTables.forEach((table) => {
    const cols_data = columnsMap[table.table_name] || [];
    const tableHeight = 14 + cols_data.length * 5 + 10;

    if (currentY + Math.min(tableHeight, 60) > detailPageH - margin) {
      doc.addPage(pageSize, orientation);
      currentY = margin;
    }

    const cat = TABLE_CATEGORIES[table.table_category] || TABLE_CATEGORIES.module_primary;

    // Table header bar
    doc.setFillColor(cat.color);
    doc.roundedRect(margin, currentY, detailPageW - margin * 2, 8, 1, 1, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#ffffff');
    doc.text(`${table.table_name}  —  ${cat.label}${table.is_shared ? '  [SHARED]' : ''}  (${cols_data.length} columns)`, margin + 3, currentY + 5.5);
    doc.setTextColor('#000000');
    currentY += 10;

    if (table.description) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text(table.description, margin + 2, currentY + 3);
      currentY += 5;
    }

    if (cols_data.length > 0) {
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin + 2, right: margin + 2 },
        head: [['#', 'Column Name', 'Data Type', 'Nullable', 'PK', 'FK', 'Default']],
        body: cols_data.map((c, i) => [
          String(i + 1),
          c.column_name,
          c.data_type,
          c.is_nullable ? 'YES' : 'NO',
          c.is_primary_key ? 'PK' : '',
          c.is_foreign_key ? 'FK' : '',
          c.column_default || '-',
        ]),
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [100, 100, 100], fontSize: 7, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 55, font: 'courier' },
          2: { cellWidth: 40, font: 'courier' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 10, halign: 'center' },
          5: { cellWidth: 10, halign: 'center' },
          6: { cellWidth: 40, font: 'courier' },
        },
        theme: 'grid',
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text('No column data available', margin + 5, currentY + 3);
      currentY += 10;
    }
  });

  // === RELATIONSHIPS PAGE ===
  doc.addPage(pageSize, orientation);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${moduleName} — Relationships`, margin, margin + 5);

  const tableNameMap = new Map(tables.map(t => [t.id, t.table_name]));

  autoTable(doc, {
    startY: margin + 12,
    margin: { left: margin, right: margin },
    head: [['Source Table', 'Source Column', '→', 'Target Table', 'Target Column', 'Type', 'Physical FK', 'Cardinality']],
    body: relationships.map(r => [
      tableNameMap.get(r.source_table_id) || '?',
      r.source_column,
      '→',
      tableNameMap.get(r.target_table_id) || '?',
      r.target_column,
      r.relationship_type,
      r.is_physical_fk ? 'Yes' : 'Inferred',
      r.cardinality || 'N/A',
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [99, 102, 241], fontStyle: 'bold' },
    columnStyles: { 2: { cellWidth: 8, halign: 'center' } },
    theme: 'grid',
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Add page numbers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${totalPages}  |  ${moduleName}  |  Generated ${new Date().toLocaleDateString()}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );
  }

  const filename = `DB_Diagram_${moduleName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
