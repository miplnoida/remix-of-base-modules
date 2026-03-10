import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Database, RefreshCw, Search, Table2, Link2, FileDown,
  Key, Download, LayoutGrid, Sparkles,
} from 'lucide-react';

import {
  fetchModules, fetchModuleByCode, fetchTablesForModule, fetchAllTables,
  fetchRelationships, fetchModuleDependencies, triggerReanalysis, logAccess,
  fetchColumnsForMultipleTables,
  TABLE_CATEGORIES, shortDataType,
  type DbModule, type DbTable, type DbRelationship, type DbModuleDependency, type DbColumn,
} from '@/services/dbDiagramService';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useIsAdmin } from '@/hooks/useNavigationMenu';
import { TableNode } from './components/TableNode';
import { ModuleDependencyView } from './components/ModuleDependencyView';
import { exportDbDiagramToPdf } from './utils/pdfExport';
import { PdfExportDialog, type PdfExportSettings } from './components/PdfExportDialog';
import { computeSmartLayout } from './utils/smartLayout';

const nodeTypes = { tableNode: TableNode };

function DbDiagramInner() {
  const { moduleCode } = useParams<{ moduleCode: string }>();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const isAdmin = useIsAdmin();
  const reactFlowInstance = useReactFlow();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'module' | 'expanded' | 'enterprise'>('module');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTable, setSelectedTable] = useState<DbTable | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<DbRelationship | null>(null);
  const [showAuditTables, setShowAuditTables] = useState(true);
  const [showLookupTables, setShowLookupTables] = useState(true);
  const [showInferredLinks, setShowInferredLinks] = useState(true);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { data: modules = [] } = useQuery({
    queryKey: ['db-diagram-modules'],
    queryFn: fetchModules,
  });

  const { data: currentModule } = useQuery({
    queryKey: ['db-diagram-module', moduleCode],
    queryFn: () => fetchModuleByCode(moduleCode || ''),
    enabled: !!moduleCode,
  });

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ['db-diagram-tables', currentModule?.id, viewMode],
    queryFn: async () => {
      if (viewMode === 'enterprise') return fetchAllTables();
      if (!currentModule?.id) return [];
      return fetchTablesForModule(currentModule.id);
    },
    enabled: viewMode === 'enterprise' || !!currentModule?.id,
  });

  const { data: relationships = [] } = useQuery({
    queryKey: ['db-diagram-relationships', tables.map(t => t.id).join(',')],
    queryFn: () => {
      const ids = tables.map(t => t.id);
      return fetchRelationships(ids.length ? ids : undefined);
    },
    enabled: tables.length > 0,
  });

  // Fetch columns for all visible tables
  const { data: columnsMap = {} } = useQuery({
    queryKey: ['db-diagram-columns', tables.map(t => t.table_name).sort().join(',')],
    queryFn: () => fetchColumnsForMultipleTables(tables.map(t => t.table_name)),
    enabled: tables.length > 0,
  });

  const { data: moduleDeps = [] } = useQuery({
    queryKey: ['db-diagram-deps', currentModule?.id],
    queryFn: () => fetchModuleDependencies(currentModule?.id),
    enabled: !!currentModule?.id || viewMode === 'enterprise',
  });

  useEffect(() => {
    if (user && currentModule) {
      logAccess(currentModule.id, user.id, user.email || '', 'view', `Viewed ${currentModule.module_name} diagram`);
    }
  }, [user, currentModule]);

  const filteredTables = useMemo(() => {
    let result = tables;
    if (!showAuditTables) result = result.filter(t => t.table_category !== 'audit_log');
    if (!showLookupTables) result = result.filter(t => t.table_category !== 'reference_lookup');
    if (searchTerm) result = result.filter(t => t.table_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return result;
  }, [tables, showAuditTables, showLookupTables, searchTerm]);

  const filteredRelationships = useMemo(() => {
    const tableIds = new Set(filteredTables.map(t => t.id));
    let result = relationships.filter(r => tableIds.has(r.source_table_id) || tableIds.has(r.target_table_id));
    if (!showInferredLinks) result = result.filter(r => !r.is_inferred);
    return result;
  }, [relationships, filteredTables, showInferredLinks]);

  // Build nodes and edges with dynamic node height based on column count
  useEffect(() => {
    if (!filteredTables.length) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Calculate node height based on column count
    const getNodeHeight = (tableName: string) => {
      const cols = columnsMap[tableName] || [];
      const displayCols = Math.min(cols.length, 15);
      const headerH = 28;
      const colRowH = 20;
      const extraH = cols.length > 15 ? 18 : 8;
      return headerH + displayCols * colRowH + extraH;
    };

    const NODE_W = 300;
    const GAP_X = 160;
    const GAP_Y = 80;
    const COLS = Math.max(2, Math.min(4, Math.ceil(Math.sqrt(filteredTables.length * 0.6))));

    // Group by category for better visual organization
    const catOrder: Record<string, number> = {
      core_master: 0, module_primary: 1, module_secondary: 2,
      shared_transaction: 3, bridge_junction: 4, reference_lookup: 5,
      audit_log: 6, temporary_work: 7, integration_staging: 8,
    };
    const sorted = [...filteredTables].sort((a, b) => {
      const aO = catOrder[a.table_category] ?? 5;
      const bO = catOrder[b.table_category] ?? 5;
      return aO - bO || a.table_name.localeCompare(b.table_name);
    });

    // Position nodes in columns, tracking Y per column
    const colYs = new Array(COLS).fill(0);
    const newNodes: Node[] = sorted.map((table, idx) => {
      // Pick the shortest column
      const col = colYs.indexOf(Math.min(...colYs));
      const nodeH = getNodeHeight(table.table_name);
      const x = col * (NODE_W + GAP_X);
      const y = colYs[col];
      colYs[col] += nodeH + GAP_Y;

      const cat = TABLE_CATEGORIES[table.table_category] || TABLE_CATEGORIES.module_primary;
      return {
        id: table.id,
        type: 'tableNode',
        position: { x, y },
        data: {
          table,
          columns: columnsMap[table.table_name] || [],
          color: cat.color,
          categoryLabel: cat.label,
          isSelected: selectedTable?.id === table.id,
          onClick: () => setSelectedTable(table),
        },
      };
    });

    const tableIdSet = new Set(filteredTables.map(t => t.id));
    const newEdges: Edge[] = filteredRelationships
      .filter(r => tableIdSet.has(r.source_table_id) && tableIdSet.has(r.target_table_id))
      .map((r, i) => ({
        id: r.id,
        source: r.source_table_id,
        target: r.target_table_id,
        sourceHandle: i % 2 === 0 ? 'right-out' : undefined,
        targetHandle: i % 2 === 0 ? 'left-in' : undefined,
        label: `${r.source_column} → ${r.target_column}`,
        labelStyle: { fontSize: 9, fontWeight: 600, fill: '#333' },
        labelBgStyle: { fill: 'rgba(255,255,255,0.85)', stroke: r.is_inferred ? '#f59e0b' : '#6366f1', strokeWidth: 0.5, rx: 3 },
        labelBgPadding: [4, 2] as [number, number],
        type: 'smoothstep',
        animated: r.is_inferred,
        style: {
          stroke: r.is_inferred ? '#f59e0b' : '#6366f1',
          strokeWidth: r.is_physical_fk ? 2.5 : 1.5,
          strokeDasharray: r.is_inferred ? '6,4' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: r.is_inferred ? '#f59e0b' : '#6366f1',
          width: 15,
          height: 15,
        },
        data: { relationship: r },
      }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [filteredTables, filteredRelationships, selectedTable, columnsMap]);

  const handleReanalyze = useCallback(async (scope: 'module' | 'enterprise') => {
    if (!user?.email) return;
    setIsReanalyzing(true);
    try {
      await triggerReanalysis(moduleCode || 'all', user.email, scope);
      await queryClient.invalidateQueries({ queryKey: ['db-diagram'] });
      toast.success(`${scope === 'enterprise' ? 'Enterprise' : 'Module'} reanalysis completed`);
    } catch (err: any) {
      toast.error('Reanalysis failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsReanalyzing(false);
    }
  }, [moduleCode, user, queryClient]);

  const handleExportPdf = useCallback(async (settings: PdfExportSettings) => {
    setIsExporting(true);
    try {
      let cols = columnsMap;
      if (Object.keys(cols).length === 0) {
        cols = await fetchColumnsForMultipleTables(filteredTables.map(t => t.table_name));
      }
      await exportDbDiagramToPdf({
        module: currentModule || null,
        tables: filteredTables,
        relationships: filteredRelationships,
        columnsMap: cols,
        pageSize: settings.pageSize,
        orientation: settings.orientation,
        zoomLevel: settings.zoomLevel,
      });
      toast.success('PDF exported successfully');
      setShowExportDialog(false);
    } catch (err: any) {
      toast.error('PDF export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  }, [currentModule, filteredTables, filteredRelationships, columnsMap]);

  // Smart auto-layout: uses graph topology to place tables intelligently
  const handleSmartLayout = useCallback(() => {
    if (!filteredTables.length) return;

    const { positions } = computeSmartLayout(filteredTables, filteredRelationships, columnsMap);

    setNodes(prev => prev.map(node => ({
      ...node,
      position: positions[node.id] || node.position,
    })));

    // Fit view after layout with slight delay for state to propagate
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.12, duration: 600 });
    }, 50);

    toast.success('Smart layout applied — tables organized by relationships');
  }, [filteredTables, filteredRelationships, columnsMap, setNodes, reactFlowInstance]);

  const tableCount = filteredTables.length;
  const relCount = filteredRelationships.length;
  const sharedCount = filteredTables.filter(t => t.is_shared).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Database className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              DB Diagram {currentModule ? `— ${currentModule.module_name}` : '— Enterprise'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Visual database architecture with table schemas and relationship mapping
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoLayout}
            disabled={!filteredTables.length}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Auto Layout
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowExportDialog(true)}
            disabled={!filteredTables.length}
          >
            <FileDown className="h-4 w-4 mr-1" />
            Export PDF
          </Button>
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReanalyze('module')}
                disabled={isReanalyzing || !moduleCode}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isReanalyzing ? 'animate-spin' : ''}`} />
                Reanalyze Module
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReanalyze('enterprise')}
                disabled={isReanalyzing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isReanalyzing ? 'animate-spin' : ''}`} />
                Reanalyze All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-primary">{tableCount}</div>
          <div className="text-xs text-muted-foreground">Tables</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-primary">{relCount}</div>
          <div className="text-xs text-muted-foreground">Relationships</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-primary">{sharedCount}</div>
          <div className="text-xs text-muted-foreground">Shared Tables</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-primary">{moduleDeps.length}</div>
          <div className="text-xs text-muted-foreground">Dependencies</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-primary">{currentModule?.current_version_no || 0}</div>
          <div className="text-xs text-muted-foreground">Version</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-xs font-medium text-primary">
            {currentModule?.last_analyzed_at
              ? new Date(currentModule.last_analyzed_at).toLocaleDateString()
              : 'Never'}
          </div>
          <div className="text-xs text-muted-foreground">Last Analyzed</div>
        </CardContent></Card>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="module" disabled={!moduleCode}>Module View</TabsTrigger>
            <TabsTrigger value="expanded" disabled={!moduleCode}>Expanded View</TabsTrigger>
            <TabsTrigger value="enterprise">Enterprise View</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Select value={moduleCode || ''} onValueChange={(v) => navigate(`/db-diagram/${v}`)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select module..." />
              </SelectTrigger>
              <SelectContent>
                {modules.map(m => (
                  <SelectItem key={m.id} value={m.module_code}>{m.module_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="mt-3">
          <CardContent className="p-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tables..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Switch id="audit" checked={showAuditTables} onCheckedChange={setShowAuditTables} />
                  <Label htmlFor="audit" className="text-xs">Audit</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch id="lookup" checked={showLookupTables} onCheckedChange={setShowLookupTables} />
                  <Label htmlFor="lookup" className="text-xs">Lookup</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch id="inferred" checked={showInferredLinks} onCheckedChange={setShowInferredLinks} />
                  <Label htmlFor="inferred" className="text-xs">Inferred</Label>
                </div>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-5 h-[2.5px] rounded-full" style={{ backgroundColor: '#6366f1' }} />
                  Physical FK
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-5 h-[2.5px] rounded-full" style={{ backgroundColor: '#f59e0b', backgroundImage: 'repeating-linear-gradient(90deg, #f59e0b 0px, #f59e0b 3px, transparent 3px, transparent 6px)' }} />
                  Inferred
                </span>
                <span className="flex items-center gap-1"><Key className="h-3 w-3 text-amber-500" /> PK</span>
                <span className="flex items-center gap-1"><Link2 className="h-3 w-3 text-blue-500" /> FK</span>
                <span className="flex items-center gap-1 font-mono text-destructive text-[10px]">NN</span> Not Null
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diagram Canvas */}
        <TabsContent value="module" className="mt-0">
          <DiagramCanvas
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onEdgeClick={(_, edge) => {
              const rel = edge.data?.relationship as DbRelationship;
              if (rel) setSelectedRelationship(rel);
            }}
            tablesLoading={tablesLoading}
          />
        </TabsContent>
        <TabsContent value="expanded" className="mt-0">
          <DiagramCanvas
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onEdgeClick={(_, edge) => {
              const rel = edge.data?.relationship as DbRelationship;
              if (rel) setSelectedRelationship(rel);
            }}
            tablesLoading={tablesLoading}
          />
        </TabsContent>
        <TabsContent value="enterprise" className="mt-0">
          <Tabs defaultValue="diagram">
            <TabsList className="mb-2">
              <TabsTrigger value="diagram">Table Diagram</TabsTrigger>
              <TabsTrigger value="dependencies">Module Dependencies</TabsTrigger>
            </TabsList>
            <TabsContent value="diagram">
              <DiagramCanvas
                nodes={nodes} edges={edges}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                onEdgeClick={(_, edge) => {
                  const rel = edge.data?.relationship as DbRelationship;
                  if (rel) setSelectedRelationship(rel);
                }}
                tablesLoading={tablesLoading}
              />
            </TabsContent>
            <TabsContent value="dependencies">
              <ModuleDependencyView modules={modules} dependencies={moduleDeps} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Table Detail Sheet */}
      <Sheet open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
        <SheetContent className="w-[500px] sm:w-[560px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              {selectedTable?.table_name}
            </SheetTitle>
          </SheetHeader>
          {selectedTable && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {TABLE_CATEGORIES[selectedTable.table_category]?.label || selectedTable.table_category}
                </Badge>
                {selectedTable.is_shared && <Badge variant="secondary">Shared</Badge>}
                {selectedTable.is_view && <Badge variant="secondary">View</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{selectedTable.description || 'No description'}</p>

              <Separator />

              {/* Full column listing */}
              <div>
                <Label className="text-xs font-semibold">Columns ({(columnsMap[selectedTable.table_name] || []).length})</Label>
                <div className="mt-2 rounded-md border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted text-muted-foreground">
                        <th className="px-2 py-1.5 text-left">#</th>
                        <th className="px-2 py-1.5 text-left">Column</th>
                        <th className="px-2 py-1.5 text-left">Type</th>
                        <th className="px-2 py-1.5 text-center">Null</th>
                        <th className="px-2 py-1.5 text-center">Key</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(columnsMap[selectedTable.table_name] || []).map((c, i) => (
                        <tr key={c.column_name} className="hover:bg-muted/50">
                          <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                          <td className="px-2 py-1 font-mono font-medium">{c.column_name}</td>
                          <td className="px-2 py-1 font-mono text-muted-foreground">{c.data_type}</td>
                          <td className="px-2 py-1 text-center">{c.is_nullable ? '✓' : <span className="text-destructive font-bold">NN</span>}</td>
                          <td className="px-2 py-1 text-center">
                            {c.is_primary_key && <Key className="h-3 w-3 text-amber-500 inline" />}
                            {c.is_foreign_key && <Link2 className="h-3 w-3 text-blue-500 inline" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Separator />

              {/* Relationships */}
              <div>
                <Label className="text-xs font-semibold">Relationships</Label>
                <div className="mt-1 space-y-1">
                  {relationships
                    .filter(r => r.source_table_id === selectedTable.id || r.target_table_id === selectedTable.id)
                    .map(r => {
                      const otherTableId = r.source_table_id === selectedTable.id ? r.target_table_id : r.source_table_id;
                      const otherTable = tables.find(t => t.id === otherTableId);
                      const direction = r.source_table_id === selectedTable.id ? '→' : '←';
                      return (
                        <div key={r.id} className="text-xs p-2 bg-muted rounded flex items-center gap-2">
                          <span className="font-mono flex-1">
                            {r.source_column} {direction} {otherTable?.table_name || '?'}.{r.target_column}
                          </span>
                          {r.is_inferred && <Badge variant="secondary" className="text-[10px]">Inferred</Badge>}
                          {r.is_physical_fk && <Badge className="text-[10px]">FK</Badge>}
                        </div>
                      );
                    })}
                  {relationships.filter(r => r.source_table_id === selectedTable.id || r.target_table_id === selectedTable.id).length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No relationships found</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Relationship Detail Sheet */}
      <Sheet open={!!selectedRelationship} onOpenChange={() => setSelectedRelationship(null)}>
        <SheetContent className="w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Relationship Details
            </SheetTitle>
          </SheetHeader>
          {selectedRelationship && (
            <div className="mt-4 space-y-3 text-sm">
              <div><Label className="text-xs text-muted-foreground">Source Table</Label>
                <p className="font-mono">{tables.find(t => t.id === selectedRelationship.source_table_id)?.table_name}</p>
              </div>
              <div><Label className="text-xs text-muted-foreground">Source Column</Label>
                <p className="font-mono">{selectedRelationship.source_column}</p>
              </div>
              <Separator />
              <div><Label className="text-xs text-muted-foreground">Target Table</Label>
                <p className="font-mono">{tables.find(t => t.id === selectedRelationship.target_table_id)?.table_name}</p>
              </div>
              <div><Label className="text-xs text-muted-foreground">Target Column</Label>
                <p className="font-mono">{selectedRelationship.target_column}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Type</Label>
                  <p>{selectedRelationship.relationship_type}</p>
                </div>
                <div><Label className="text-xs text-muted-foreground">Cardinality</Label>
                  <p>{selectedRelationship.cardinality || 'N/A'}</p>
                </div>
                <div><Label className="text-xs text-muted-foreground">Physical FK</Label>
                  <Badge variant={selectedRelationship.is_physical_fk ? 'default' : 'secondary'}>
                    {selectedRelationship.is_physical_fk ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div><Label className="text-xs text-muted-foreground">Strength</Label>
                  <p>{selectedRelationship.dependency_strength}</p>
                </div>
              </div>
              {selectedRelationship.description && (
                <div><Label className="text-xs text-muted-foreground">Description</Label>
                  <p>{selectedRelationship.description}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* PDF Export Settings Dialog */}
      <PdfExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExportPdf}
        isExporting={isExporting}
        tableCount={filteredTables.length}
      />
    </div>
  );
}

function DiagramCanvas({ nodes, edges, onNodesChange, onEdgesChange, onEdgeClick, tablesLoading }: any) {
  if (tablesLoading) {
    return (
      <Card className="h-[700px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading diagram...</p>
        </div>
      </Card>
    );
  }

  if (!nodes.length) {
    return (
      <Card className="h-[700px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No diagram data available</p>
          <p className="text-sm mt-1">Select a module or click "Reanalyze" to generate</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-[700px]" id="db-diagram-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.05}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls position="bottom-right" />
        <MiniMap
          nodeStrokeColor="#6366f1"
          nodeColor={(n) => (n.data as any)?.color || '#3b82f6'}
          nodeBorderRadius={4}
          position="bottom-left"
          style={{ width: 180, height: 120 }}
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
      </ReactFlow>
    </Card>
  );
}

// Wrap in ReactFlowProvider for internal hooks
export default function DbDiagramPage() {
  return (
    <ReactFlowProvider>
      <DbDiagramInner />
    </ReactFlowProvider>
  );
}
