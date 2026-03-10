import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DbModule, DbTable, DbRelationship, DbColumn,
  TABLE_CATEGORIES, shortDataType,
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

// Helper: parse hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Draws rich table cards directly in jsPDF with columns, data types, PK/FK icons.
 * This avoids html2canvas issues and gives a clean, scalable vector PDF.
 */
export async function exportDbDiagramToPdf({
  module, tables, relationships, columnsMap,
  pageSize = 'a2',
  orientation = 'landscape',
  zoomLevel = 75,
}: ExportData) {
  const doc = new jsPDF({ orientation, unit: 'mm', format: pageSize });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 8; // margin
  const moduleName = module?.module_name || 'Enterprise';

  // ─── Zoom factor: controls how much content fits on the page ───
  // Lower zoom = smaller cards = more tables fit on one page
  const scale = zoomLevel / 100;

  // ─── Card dimensions (in mm, before scaling) ───
  const BASE_CARD_W = 62;
  const BASE_HDR_H = 6;
  const BASE_ROW_H = 3.8;
  const BASE_GAP_X = 8;
  const BASE_GAP_Y = 6;
  const BASE_FONT_HDR = 6;
  const BASE_FONT_COL = 4.5;
  const BASE_FONT_TYPE = 4;

  const CARD_W = BASE_CARD_W * scale;
  const HDR_H = BASE_HDR_H * scale;
  const ROW_H = BASE_ROW_H * scale;
  const GAP_X = BASE_GAP_X * scale;
  const GAP_Y = BASE_GAP_Y * scale;
  const FONT_HDR = BASE_FONT_HDR * scale;
  const FONT_COL = BASE_FONT_COL * scale;
  const FONT_TYPE = BASE_FONT_TYPE * scale;

  // Title bar
  const titleH = Math.max(8, 10 * scale);
  doc.setFillColor(0, 155, 76);
  doc.rect(0, 0, pageW, titleH, 'F');
  doc.setFontSize(Math.max(7, 11 * scale));
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`DB Diagram: ${moduleName}`, M, titleH * 0.65);
  doc.setFontSize(Math.max(5, 7 * scale));
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated: ${new Date().toLocaleString()}  |  Tables: ${tables.length}  |  Relationships: ${relationships.length}  |  Scale: ${zoomLevel}%`,
    pageW - M, titleH * 0.65, { align: 'right' }
  );

  // ─── Sort tables by category ───
  const catOrder: Record<string, number> = {
    core_master: 0, module_primary: 1, module_secondary: 2,
    shared_transaction: 3, bridge_junction: 4, reference_lookup: 5,
    audit_log: 6, temporary_work: 7, integration_staging: 8,
  };
  const sortedTables = [...tables].sort((a, b) =>
    (catOrder[a.table_category] ?? 5) - (catOrder[b.table_category] ?? 5) || a.table_name.localeCompare(b.table_name)
  );

  // ─── Calculate card heights & column-pack layout ───
  const availW = pageW - M * 2;
  const startY = titleH + 3;
  const availH = pageH - startY - M - 4;
  const numCols = Math.max(2, Math.floor((availW + GAP_X) / (CARD_W + GAP_X)));

  interface CardInfo {
    table: DbTable;
    cols: DbColumn[];
    cardH: number;
  }

  const cards: CardInfo[] = sortedTables.map(table => {
    const cols = columnsMap[table.table_name] || [];
    const displayCount = cols.length; // show ALL columns
    const cardH = HDR_H + displayCount * ROW_H + (displayCount === 0 ? ROW_H : 0) + 1.5 * scale;
    return { table, cols, cardH };
  });

  // Column-packing: assign each card to the shortest column
  const colYs: number[] = new Array(numCols).fill(0);
  const cardPositions: { x: number; y: number; card: CardInfo; page: number }[] = [];
  let currentPage = 0;

  cards.forEach(card => {
    const shortestCol = colYs.indexOf(Math.min(...colYs));
    let y = colYs[shortestCol];

    // Check if it fits on current page
    if (y + card.cardH > availH) {
      // Check if ALL columns are too tall, meaning we need a new page
      if (Math.min(...colYs) + card.cardH > availH) {
        // New page
        currentPage++;
        colYs.fill(0);
        y = 0;
        const shortestAfterReset = colYs.indexOf(Math.min(...colYs));
        const x = M + shortestAfterReset * (CARD_W + GAP_X);
        colYs[shortestAfterReset] = card.cardH + GAP_Y;
        cardPositions.push({ x, y: startY + y, card, page: currentPage });
        return;
      }
      // Try next shortest column
      const sorted_cols = colYs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
      for (const sc of sorted_cols) {
        if (sc.v + card.cardH <= availH) {
          const x = M + sc.i * (CARD_W + GAP_X);
          cardPositions.push({ x, y: startY + sc.v, card, page: currentPage });
          colYs[sc.i] = sc.v + card.cardH + GAP_Y;
          return;
        }
      }
      // None fit — new page
      currentPage++;
      colYs.fill(0);
      y = 0;
    }

    const x = M + shortestCol * (CARD_W + GAP_X);
    cardPositions.push({ x, y: startY + colYs[shortestCol], card, page: currentPage });
    colYs[shortestCol] += card.cardH + GAP_Y;
  });

  // ─── Draw cards page by page ───
  const totalDiagramPages = currentPage + 1;

  for (let pg = 0; pg < totalDiagramPages; pg++) {
    if (pg > 0) {
      doc.addPage(pageSize, orientation);
      // Mini title bar for continuation pages
      doc.setFillColor(0, 155, 76);
      doc.rect(0, 0, pageW, titleH * 0.7, 'F');
      doc.setFontSize(Math.max(5, 7 * scale));
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${moduleName} — continued (page ${pg + 1})`, M, titleH * 0.45);
    }

    const pageCards = cardPositions.filter(cp => cp.page === pg);

    // Build position lookup for relationship lines
    const tablePositions: Record<string, { cx: number; cy: number; x: number; y: number; w: number; h: number }> = {};

    pageCards.forEach(({ x, y, card }) => {
      const { table, cols, cardH } = card;
      const cat = TABLE_CATEGORIES[table.table_category] || TABLE_CATEGORIES.module_primary;
      const [cr, cg, cb] = hexToRgb(cat.color);

      // Card border
      doc.setDrawColor(cr, cg, cb);
      doc.setLineWidth(0.3 * scale);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, CARD_W, cardH, 1 * scale, 1 * scale, 'FD');

      // Header
      doc.setFillColor(cr, cg, cb);
      doc.roundedRect(x, y, CARD_W, HDR_H, 1 * scale, 1 * scale, 'F');
      doc.rect(x, y + HDR_H - 1 * scale, CARD_W, 1 * scale, 'F'); // square bottom corners

      doc.setFontSize(FONT_HDR);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      const maxChars = Math.floor(CARD_W / (FONT_HDR * 0.48));
      const displayName = table.table_name.length > maxChars
        ? table.table_name.slice(0, maxChars - 1) + '…'
        : table.table_name;
      doc.text(displayName, x + 1.5 * scale, y + HDR_H - 1.5 * scale);

      // Category badge
      doc.setFontSize(Math.max(3, FONT_TYPE * 0.8));
      const badge = cat.label;
      const badgeW = doc.getTextWidth(badge) + 2 * scale;
      doc.setFillColor(255, 255, 255, 50);
      doc.roundedRect(x + CARD_W - badgeW - 1 * scale, y + 0.8 * scale, badgeW, HDR_H - 1.6 * scale, 0.5, 0.5, 'F');
      doc.setTextColor(cr, cg, cb);
      doc.text(badge, x + CARD_W - badgeW - 0.2 * scale + 1 * scale, y + HDR_H - 1.8 * scale);

      // Columns
      let rowY = y + HDR_H + 0.5 * scale;
      doc.setTextColor(0, 0, 0);

      if (cols.length === 0) {
        doc.setFontSize(FONT_TYPE);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text('No column data', x + 2 * scale, rowY + ROW_H * 0.7);
      } else {
        cols.forEach((col, idx) => {
          // Alternate row bg
          if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(x + 0.2, rowY, CARD_W - 0.4, ROW_H, 'F');
          }

          // PK/FK indicator
          const iconX = x + 1 * scale;
          if (col.is_primary_key) {
            doc.setFontSize(FONT_TYPE);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(245, 158, 11); // amber
            doc.text('🔑', iconX, rowY + ROW_H * 0.7);
          } else if (col.is_foreign_key) {
            doc.setFontSize(FONT_TYPE);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(59, 130, 246); // blue
            doc.text('FK', iconX, rowY + ROW_H * 0.7);
          } else {
            doc.setFillColor(180, 180, 180);
            doc.circle(iconX + 1 * scale, rowY + ROW_H * 0.45, 0.4 * scale, 'F');
          }

          // Column name
          const nameX = x + 5 * scale;
          doc.setFontSize(FONT_COL);
          doc.setFont('courier', col.is_primary_key ? 'bold' : 'normal');
          doc.setTextColor(col.is_primary_key ? 0 : col.is_foreign_key ? 30 : 80);
          const maxNameW = CARD_W * 0.52;
          const nameStr = col.column_name;
          const nameMaxChars = Math.floor(maxNameW / (FONT_COL * 0.5));
          doc.text(
            nameStr.length > nameMaxChars ? nameStr.slice(0, nameMaxChars - 1) + '…' : nameStr,
            nameX, rowY + ROW_H * 0.7
          );

          // Data type
          const typeX = x + CARD_W * 0.62;
          doc.setFontSize(FONT_TYPE);
          doc.setFont('courier', 'normal');
          doc.setTextColor(120, 120, 120);
          const typeStr = shortDataType(col.data_type);
          doc.text(typeStr, typeX, rowY + ROW_H * 0.7);

          // Not-null indicator
          if (!col.is_nullable) {
            doc.setFontSize(Math.max(2.5, FONT_TYPE * 0.7));
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(220, 38, 38); // red
            doc.text('NN', x + CARD_W - 4 * scale, rowY + ROW_H * 0.7);
          }

          rowY += ROW_H;
        });
      }

      // Save position for relationship lines
      tablePositions[table.id] = {
        x, y, w: CARD_W, h: cardH,
        cx: x + CARD_W / 2, cy: y + cardH / 2,
      };
    });

    // ─── Draw relationship lines for cards on this page ───
    doc.setLineWidth(0.2 * scale);
    relationships.forEach(rel => {
      const src = tablePositions[rel.source_table_id];
      const tgt = tablePositions[rel.target_table_id];
      if (!src || !tgt) return;

      const [lineR, lineG, lineB] = rel.is_inferred ? [245, 158, 11] : [99, 102, 241];
      doc.setDrawColor(lineR, lineG, lineB);

      if (rel.is_inferred) {
        doc.setLineDashPattern([1.5 * scale, 1 * scale], 0);
      } else {
        doc.setLineDashPattern([], 0);
      }

      // Connect from nearest edges
      const dx = tgt.cx - src.cx;
      const dy = tgt.cy - src.cy;
      let sx: number, sy: number, tx: number, ty: number;
      if (Math.abs(dx) > Math.abs(dy)) {
        sx = dx > 0 ? src.x + src.w : src.x;
        sy = src.cy;
        tx = dx > 0 ? tgt.x : tgt.x + tgt.w;
        ty = tgt.cy;
      } else {
        sx = src.cx;
        sy = dy > 0 ? src.y + src.h : src.y;
        tx = tgt.cx;
        ty = dy > 0 ? tgt.y : tgt.y + tgt.h;
      }

      doc.line(sx, sy, tx, ty);

      // Arrowhead
      const angle = Math.atan2(ty - sy, tx - sx);
      const arrowLen = 2 * scale;
      doc.line(tx, ty, tx - arrowLen * Math.cos(angle - 0.4), ty - arrowLen * Math.sin(angle - 0.4));
      doc.line(tx, ty, tx - arrowLen * Math.cos(angle + 0.4), ty - arrowLen * Math.sin(angle + 0.4));
    });
    doc.setLineDashPattern([], 0);
  }

  // ─── Category Legend (bottom of last diagram page) ───
  const legendY = pageH - M - 3;
  let lx = M;
  doc.setFontSize(Math.max(4, 5 * scale));
  doc.setFont('helvetica', 'normal');
  Object.entries(TABLE_CATEGORIES).forEach(([, val]) => {
    const [r, g, b] = hexToRgb(val.color);
    doc.setFillColor(r, g, b);
    doc.rect(lx, legendY, 2.5 * scale, 2.5 * scale, 'F');
    doc.setTextColor(80, 80, 80);
    doc.text(val.label, lx + 3 * scale, legendY + 2 * scale);
    lx += doc.getTextWidth(val.label) + 5 * scale;
  });

  // ─── Data Dictionary (appendix pages) ───
  doc.addPage(pageSize, orientation);
  const dictPageW = doc.internal.pageSize.getWidth();
  const dictPageH = doc.internal.pageSize.getHeight();

  doc.setFillColor(51, 51, 51);
  doc.rect(0, 0, dictPageW, 10, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  const totalColCount = Object.values(columnsMap).reduce((s, c) => s + c.length, 0);
  doc.text(`${moduleName} — Data Dictionary (${tables.length} tables, ${totalColCount} columns)`, M, 7);
  doc.setTextColor(0, 0, 0);

  const useTwoCols = dictPageW > 350;
  const colWidth = useTwoCols ? (dictPageW - M * 3) / 2 : dictPageW - M * 2;
  let dictY = 14;
  let dictCol = 0;
  const getColX = (c: number) => M + c * (colWidth + M);

  sortedTables.forEach((table) => {
    const cols_data = columnsMap[table.table_name] || [];
    const estHeight = 6 + 4 + cols_data.length * 3.5 + 4;

    if (dictY + Math.min(estHeight, 40) > dictPageH - M) {
      if (useTwoCols && dictCol === 0) {
        dictCol = 1;
        dictY = 14;
      } else {
        doc.addPage(pageSize, orientation);
        dictY = M;
        dictCol = 0;
      }
    }

    const cat = TABLE_CATEGORIES[table.table_category] || TABLE_CATEGORIES.module_primary;
    const leftX = getColX(dictCol);
    const [cr, cg, cb] = hexToRgb(cat.color);

    doc.setFillColor(cr, cg, cb);
    doc.roundedRect(leftX, dictY, colWidth, 5, 0.8, 0.8, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${table.table_name}  (${cols_data.length} cols)${table.is_shared ? '  [SHARED]' : ''}`, leftX + 2, dictY + 3.5);
    doc.setTextColor(0, 0, 0);
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
      doc.setTextColor(150, 150, 150);
      doc.text('No column data', leftX + 2, dictY + 2);
      dictY += 5;
    }
  });

  // ─── Relationships appendix ───
  if (relationships.length > 0) {
    const relEstH = 10 + relationships.length * 3.5;
    if (dictY + Math.min(relEstH, 30) > dictPageH - M || dictCol === 1) {
      doc.addPage(pageSize, orientation);
      dictY = M;
    } else {
      dictY += 5;
    }

    const relPageW = doc.internal.pageSize.getWidth();
    doc.setFillColor(99, 102, 241);
    doc.roundedRect(M, dictY, relPageW - M * 2, 6, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`Relationships (${relationships.length})`, M + 3, dictY + 4);
    doc.setTextColor(0, 0, 0);
    dictY += 7;

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
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i}/${totalPages}  |  ${moduleName}  |  ${new Date().toLocaleDateString()}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 3,
      { align: 'center' }
    );
  }

  const filename = `DB_Diagram_${moduleName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
