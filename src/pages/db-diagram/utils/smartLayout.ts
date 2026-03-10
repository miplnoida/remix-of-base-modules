/**
 * Smart Auto-Layout Engine
 * Uses graph topology analysis to position tables optimally:
 * - Core/highly-connected tables placed centrally
 * - Connected tables grouped nearby
 * - Minimizes edge crossings via layered positioning
 * - Avoids node overlapping with dynamic sizing
 */

import type { DbTable, DbRelationship, DbColumn } from '@/services/dbDiagramService';

interface LayoutNode {
  id: string;
  table: DbTable;
  width: number;
  height: number;
  x: number;
  y: number;
  degree: number; // total connections
  layer: number;  // BFS layer from center
}

interface LayoutResult {
  positions: Record<string, { x: number; y: number }>;
}

const NODE_W = 300;
const HEADER_H = 28;
const COL_ROW_H = 20;
const MAX_DISPLAY_COLS = 15;

function getNodeHeight(columnCount: number): number {
  const displayCols = Math.min(columnCount, MAX_DISPLAY_COLS);
  const extraH = columnCount > MAX_DISPLAY_COLS ? 18 : 8;
  return HEADER_H + displayCols * COL_ROW_H + extraH;
}

/** Category importance — lower = more central */
const CATEGORY_PRIORITY: Record<string, number> = {
  core_master: 0,
  module_primary: 1,
  shared_transaction: 2,
  module_secondary: 3,
  bridge_junction: 4,
  reference_lookup: 5,
  audit_log: 6,
  temporary_work: 7,
  integration_staging: 8,
};

export function computeSmartLayout(
  tables: DbTable[],
  relationships: DbRelationship[],
  columnsMap: Record<string, DbColumn[]>,
): LayoutResult {
  if (!tables.length) return { positions: {} };

  const tableIds = new Set(tables.map(t => t.id));

  // Build adjacency + degree map
  const adj = new Map<string, Set<string>>();
  tables.forEach(t => adj.set(t.id, new Set()));

  const relevantRels = relationships.filter(
    r => tableIds.has(r.source_table_id) && tableIds.has(r.target_table_id)
  );

  relevantRels.forEach(r => {
    adj.get(r.source_table_id)?.add(r.target_table_id);
    adj.get(r.target_table_id)?.add(r.source_table_id);
  });

  // Score each table: high degree + low category priority = central
  const scores = new Map<string, number>();
  tables.forEach(t => {
    const degree = adj.get(t.id)?.size || 0;
    const catPri = CATEGORY_PRIORITY[t.table_category] ?? 5;
    // Higher score = more central
    scores.set(t.id, degree * 10 + (8 - catPri));
  });

  // Sort by score descending to find the "root" / most central table
  const sortedByScore = [...tables].sort(
    (a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0)
  );

  // BFS from the most central table to assign layers
  const layers = new Map<string, number>();
  const visited = new Set<string>();
  const queue: string[] = [];

  // Start BFS from top-scored table
  const rootId = sortedByScore[0].id;
  queue.push(rootId);
  visited.add(rootId);
  layers.set(rootId, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layers.get(current)!;
    const neighbors = adj.get(current) || new Set();
    
    // Sort neighbors by score so higher-scored ones get processed first
    const sortedNeighbors = [...neighbors].sort(
      (a, b) => (scores.get(b) || 0) - (scores.get(a) || 0)
    );

    for (const neighbor of sortedNeighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        layers.set(neighbor, currentLayer + 1);
        queue.push(neighbor);
      }
    }
  }

  // Handle disconnected tables (no relationships)
  let maxLayer = 0;
  layers.forEach(l => { if (l > maxLayer) maxLayer = l; });
  
  tables.forEach(t => {
    if (!layers.has(t.id)) {
      maxLayer++;
      layers.set(t.id, maxLayer);
    }
  });

  // Group tables by layer
  const layerGroups = new Map<number, DbTable[]>();
  tables.forEach(t => {
    const layer = layers.get(t.id) || 0;
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(t);
  });

  // Within each layer, sort by score descending so important ones are centered
  layerGroups.forEach((group) => {
    group.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
  });

  // Calculate positions layer by layer (horizontal layers, left to right)
  const GAP_X = 120; // horizontal gap between layers
  const GAP_Y = 60;  // vertical gap within layer
  const positions: Record<string, { x: number; y: number }> = {};

  const sortedLayers = [...layerGroups.keys()].sort((a, b) => a - b);

  // First pass: calculate each layer's total height
  const layerHeights: number[] = [];
  const layerNodeHeights: Map<number, number[]> = new Map();

  sortedLayers.forEach(layerIdx => {
    const group = layerGroups.get(layerIdx)!;
    const heights = group.map(t => {
      const colCount = (columnsMap[t.table_name] || []).length;
      return getNodeHeight(colCount);
    });
    layerNodeHeights.set(layerIdx, heights);
    const totalH = heights.reduce((sum, h) => sum + h, 0) + (heights.length - 1) * GAP_Y;
    layerHeights.push(totalH);
  });

  const maxTotalHeight = Math.max(...layerHeights, 0);

  // Second pass: position each node
  let layerX = 0;

  sortedLayers.forEach((layerIdx, li) => {
    const group = layerGroups.get(layerIdx)!;
    const heights = layerNodeHeights.get(layerIdx)!;
    const layerTotalH = layerHeights[li];

    // Center this layer vertically relative to the tallest layer
    let startY = (maxTotalHeight - layerTotalH) / 2;

    group.forEach((table, i) => {
      positions[table.id] = { x: layerX, y: startY };
      startY += heights[i] + GAP_Y;
    });

    // Advance X by the node width + gap
    layerX += NODE_W + GAP_X;
  });

  // --- Edge crossing reduction pass ---
  // For each layer (except first), reorder nodes to minimize crossings
  // using barycenter heuristic (2 iterations)
  for (let iteration = 0; iteration < 3; iteration++) {
    for (let li = 1; li < sortedLayers.length; li++) {
      const layerIdx = sortedLayers[li];
      const group = layerGroups.get(layerIdx)!;
      const prevLayerIdx = sortedLayers[li - 1];
      const prevGroup = layerGroups.get(prevLayerIdx)!;

      // Map prev layer table positions to indices
      const prevOrder = new Map<string, number>();
      prevGroup.forEach((t, i) => prevOrder.set(t.id, i));

      // Compute barycenter for each node in current layer
      const barycenters = group.map(t => {
        const neighbors = adj.get(t.id) || new Set();
        const prevNeighbors = [...neighbors].filter(n => prevOrder.has(n));
        if (prevNeighbors.length === 0) return Infinity;
        const sum = prevNeighbors.reduce((s, n) => s + (prevOrder.get(n) || 0), 0);
        return sum / prevNeighbors.length;
      });

      // Sort by barycenter
      const indexed = group.map((t, i) => ({ table: t, bc: barycenters[i], idx: i }));
      indexed.sort((a, b) => a.bc - b.bc);

      // Reassign positions within this layer
      const heights = layerNodeHeights.get(layerIdx)!;
      const reorderedHeights = indexed.map(item => heights[item.idx]);
      const layerTotalH = reorderedHeights.reduce((s, h) => s + h, 0) + (reorderedHeights.length - 1) * GAP_Y;
      let startY = (maxTotalHeight - layerTotalH) / 2;
      const x = positions[group[0]?.id]?.x || 0;

      indexed.forEach((item, i) => {
        positions[item.table.id] = { x, y: startY };
        startY += reorderedHeights[i] + GAP_Y;
      });

      // Update group order for next iteration
      layerGroups.set(layerIdx, indexed.map(item => item.table));
      layerNodeHeights.set(layerIdx, reorderedHeights);
    }
  }

  return { positions };
}
