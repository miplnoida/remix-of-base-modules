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
}

export function exportDbDiagramToPdf({ module, tables, relationships, columnsMap }: ExportData) {
  // Use A1 landscape (841 x 594 mm) for big overview; fallback A2 if fewer tables
  const pageSize = tables.length > 20 ? 'a1' : tables.length > 8 ? 'a2' : 'a3';
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: pageSize });

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

  // Summary stats
  const fkCount = relationships.filter(r => r.is_physical_fk).length;
  const inferredCount = relationships.filter(r => r.is_inferred).length;
  const sharedCount = tables.filter(t => t.is_shared).length;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, 75);

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
    doc.text(line, margin, 85 + i * 7);
  });

  // Category legend
  let legendY = 85 + summaryLines.length * 7 + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Table Categories:', margin, legendY);
  legendY += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  Object.entries(TABLE_CATEGORIES).forEach(([key, val]) => {
    doc.setFillColor(val.color);
    doc.rect(margin, legendY - 3, 4, 4, 'F');
    doc.text(`  ${val.label}`, margin + 5, legendY);
    legendY += 5;
  });

  // === PAGE 2: Visual Overview - Table boxes with connections ===
  doc.addPage(pageSize, 'landscape');
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${moduleName} — Table Relationship Overview`, pageW / 2, margin + 5, { align: 'center' });

  // Draw table boxes in a grid layout
  const boxW = 75;
  const boxH_base = 22;
  const gapX = 20;
  const gapY = 15;
  const startX = margin + 5;
  const startY = margin + 18;
  const cols = Math.max(3, Math.floor((pageW - margin * 2) / (boxW + gapX)));

  const tablePositions: Record<string, { x: number; y: number; w: number; h: number }> = {};
  
  // Sort tables: primary first, then by name
  const sortedTables = [...tables].sort((a, b) => {
    const catOrder: Record<string, number> = {
      core_master: 0, module_primary: 1, module_secondary: 2,
      shared_transaction: 3, bridge_junction: 4, reference_lookup: 5,
      audit_log: 6, temporary_work: 7
    };
    const aO = catOrder[a.table_category] ?? 5;
    const bO = catOrder[b.table_category] ?? 5;
    return aO - bO || a.table_name.localeCompare(b.table_name);
  });

  sortedTables.forEach((table, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = startX + col * (boxW + gapX);
    const y = startY + row * (boxH_base + gapY);

    // Check if we need a new page
    if (y + boxH_base > pageH - margin) {
      doc.addPage(pageSize, 'landscape');
      return; // Skip for now, will handle overflow
    }

    const cat = TABLE_CATEGORIES[table.table_category] || TABLE_CATEGORIES.module_primary;

    // Draw box
    doc.setDrawColor(cat.color);
    doc.setLineWidth(0.5);
    doc.setFillColor('#ffffff');
    doc.roundedRect(x, y, boxW, boxH_base, 2, 2, 'FD');

    // Color header bar
    doc.setFillColor(cat.color);
    doc.roundedRect(x, y, boxW, 7, 2, 2, 'F');
    doc.rect(x, y + 3, boxW, 4, 'F'); // Fill bottom part of header rounded rect

    // Table name
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#ffffff');
    const displayName = table.table_name.length > 28 
      ? table.table_name.slice(0, 26) + '...' 
      : table.table_name;
    doc.text(displayName, x + 2, y + 5);

    // Category + columns count
    doc.setTextColor('#333333');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    const colCount = columnsMap[table.table_name]?.length || 0;
    doc.text(`${cat.label} | ${colCount} cols`, x + 2, y + 12);

    // Show PK info
    if (table.primary_key_summary) {
      doc.setFontSize(5.5);
      doc.setTextColor('#888888');
      doc.text(`PK: ${table.primary_key_summary}`, x + 2, y + 16);
    }

    // FK count
    const fkRels = relationships.filter(r => r.source_table_id === table.id);
    if (fkRels.length > 0) {
      doc.text(`${fkRels.length} FK(s)`, x + 2, y + 20);
    }

    tablePositions[table.id] = { x, y, w: boxW, h: boxH_base };
    doc.setTextColor('#000000');
  });

  // Draw relationship lines
  doc.setLineWidth(0.3);
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

    // Draw line from source bottom to target top
    const sx = src.x + src.w / 2;
    const sy = src.y + src.h;
    const tx = tgt.x + tgt.w / 2;
    const ty = tgt.y;

    doc.line(sx, sy, tx, ty);

    // Arrow head
    const angle = Math.atan2(ty - sy, tx - sx);
    const arrowLen = 2;
    doc.line(tx, ty, tx - arrowLen * Math.cos(angle - 0.4), ty - arrowLen * Math.sin(angle - 0.4));
    doc.line(tx, ty, tx - arrowLen * Math.cos(angle + 0.4), ty - arrowLen * Math.sin(angle + 0.4));
  });
  doc.setLineDashPattern([], 0);

  // === PAGES 3+: Detailed Table Schemas ===
  doc.addPage('a3', 'landscape');
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  doc.text(`${moduleName} — Detailed Table Schemas`, margin, margin + 5);

  let currentY = margin + 15;
  const detailPageW = doc.internal.pageSize.getWidth();
  const detailPageH = doc.internal.pageSize.getHeight();

  sortedTables.forEach((table) => {
    const cols_data = columnsMap[table.table_name] || [];
    const tableHeight = 12 + cols_data.length * 5 + 10;

    // Check if we need a new page
    if (currentY + Math.min(tableHeight, 80) > detailPageH - margin) {
      doc.addPage('a3', 'landscape');
      currentY = margin;
    }

    const cat = TABLE_CATEGORIES[table.table_category] || TABLE_CATEGORIES.module_primary;

    // Table header
    doc.setFillColor(cat.color);
    doc.roundedRect(margin, currentY, detailPageW - margin * 2, 8, 1, 1, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#ffffff');
    doc.text(`${table.table_name}  —  ${cat.label}${table.is_shared ? '  [SHARED]' : ''}`, margin + 3, currentY + 5.5);
    doc.setTextColor('#000000');
    currentY += 10;

    // Description
    if (table.description) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text(table.description, margin + 2, currentY + 3);
      currentY += 5;
    }

    // Columns table
    if (cols_data.length > 0) {
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin + 2, right: margin + 2 },
        head: [['#', 'Column Name', 'Data Type', 'Nullable', 'PK', 'FK']],
        body: cols_data.map((c, i) => [
          String(i + 1),
          c.column_name,
          c.data_type,
          c.is_nullable ? 'YES' : 'NO',
          c.is_primary_key ? '🔑' : '',
          c.is_foreign_key ? '🔗' : '',
        ]),
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [100, 100, 100], fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 55, font: 'courier' },
          2: { cellWidth: 40, font: 'courier' },
          3: { cellWidth: 15 },
          4: { cellWidth: 10, halign: 'center' },
          5: { cellWidth: 10, halign: 'center' },
        },
        theme: 'grid',
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    } else {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text('No column data available', margin + 5, currentY + 3);
      currentY += 8;
    }
  });

  // === Relationships Page ===
  doc.addPage('a3', 'landscape');
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
    headStyles: { fillColor: [99, 102, 241] },
    columnStyles: {
      2: { cellWidth: 8, halign: 'center' },
    },
    theme: 'grid',
  });

  // Save
  const filename = `DB_Diagram_${moduleName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
