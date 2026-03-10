import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Database, RefreshCw, Search, Table2, ArrowRight, Link2, Eye, EyeOff,
  Maximize, ZoomIn, ZoomOut, Download, Layers, GitBranch, Shield, Clock, User,
  ChevronRight, Info, Box, AlertTriangle
} from 'lucide-react';

import {
  fetchModules, fetchModuleByCode, fetchTablesForModule, fetchAllTables,
  fetchRelationships, fetchModuleDependencies, triggerReanalysis, logAccess,
  TABLE_CATEGORIES, DbModule, DbTable, DbRelationship, DbModuleDependency,
} from '@/services/dbDiagramService';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useIsAdmin } from '@/hooks/useNavigationMenu';
import { TableNode } from './components/TableNode';
import { ModuleDependencyView } from './components/ModuleDependencyView';

const nodeTypes = { tableNode: TableNode };

export default function DbDiagramPage() {
  const { moduleCode } = useParams<{ moduleCode: string }>();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'module' | 'expanded' | 'enterprise'>('module');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTable, setSelectedTable] = useState<DbTable | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<DbRelationship | null>(null);
  const [showAuditTables, setShowAuditTables] = useState(true);
  const [showLookupTables, setShowLookupTables] = useState(true);
  const [showInferredLinks, setShowInferredLinks] = useState(true);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch all modules
  const { data: modules = [] } = useQuery({
    queryKey: ['db-diagram-modules'],
    queryFn: fetchModules,
  });

  // Fetch current module
  const { data: currentModule } = useQuery({
    queryKey: ['db-diagram-module', moduleCode],
    queryFn: () => fetchModuleByCode(moduleCode || ''),
    enabled: !!moduleCode,
  });

  // Fetch tables
  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ['db-diagram-tables', currentModule?.id, viewMode],
    queryFn: async () => {
      if (viewMode === 'enterprise') return fetchAllTables();
      if (!currentModule?.id) return [];
      return fetchTablesForModule(currentModule.id);
    },
    enabled: viewMode === 'enterprise' || !!currentModule?.id,
  });

  // Fetch relationships
  const { data: relationships = [] } = useQuery({
    queryKey: ['db-diagram-relationships', tables.map(t => t.id).join(',')],
    queryFn: () => {
      const ids = tables.map(t => t.id);
      return fetchRelationships(ids.length ? ids : undefined);
    },
    enabled: tables.length > 0,
  });

  // Fetch module dependencies
  const { data: moduleDeps = [] } = useQuery({
    queryKey: ['db-diagram-deps', currentModule?.id],
    queryFn: () => fetchModuleDependencies(currentModule?.id),
    enabled: !!currentModule?.id || viewMode === 'enterprise',
  });

  // Log access
  useEffect(() => {
    if (user && currentModule) {
      logAccess(currentModule.id, user.id, user.email || '', 'view', `Viewed ${currentModule.module_name} diagram`);
    }
  }, [user, currentModule]);

  // Filter tables
  const filteredTables = useMemo(() => {
    let result = tables;
    if (!showAuditTables) result = result.filter(t => t.table_category !== 'audit_log');
    if (!showLookupTables) result = result.filter(t => t.table_category !== 'reference_lookup');
    if (searchTerm) result = result.filter(t => t.table_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return result;
  }, [tables, showAuditTables, showLookupTables, searchTerm]);

  // Filter relationships
  const filteredRelationships = useMemo(() => {
    const tableIds = new Set(filteredTables.map(t => t.id));
    let result = relationships.filter(r => tableIds.has(r.source_table_id) || tableIds.has(r.target_table_id));
    if (!showInferredLinks) result = result.filter(r => !r.is_inferred);
    return result;
  }, [relationships, filteredTables, showInferredLinks]);

  // Build React Flow nodes and edges
  useEffect(() => {
    if (!filteredTables.length) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const COLS = Math.max(3, Math.ceil(Math.sqrt(filteredTables.length)));
    const NODE_W = 280;
    const NODE_H = 120;
    const GAP_X = 60;
    const GAP_Y = 50;

    const newNodes: Node[] = filteredTables.map((table, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const cat = TABLE_CATEGORIES[table.table_category] || TABLE_CATEGORIES.module_primary;
      return {
        id: table.id,
        type: 'tableNode',
        position: { x: col * (NODE_W + GAP_X), y: row * (NODE_H + GAP_Y) },
        data: {
          table,
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
      .map(r => ({
        id: r.id,
        source: r.source_table_id,
        target: r.target_table_id,
        label: `${r.source_column} → ${r.target_column}`,
        type: 'smoothstep',
        animated: r.is_inferred,
        style: {
          stroke: r.is_inferred ? '#f59e0b' : '#6366f1',
          strokeWidth: r.is_physical_fk ? 2 : 1,
          strokeDasharray: r.is_inferred ? '5,5' : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: r.is_inferred ? '#f59e0b' : '#6366f1' },
        data: { relationship: r },
      }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [filteredTables, filteredRelationships, selectedTable]);

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
              Visual database relationship map and architecture explorer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

          {/* Module Selector */}
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
                  <Label htmlFor="audit" className="text-xs">Audit Tables</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch id="lookup" checked={showLookupTables} onCheckedChange={setShowLookupTables} />
                  <Label htmlFor="lookup" className="text-xs">Lookup Tables</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch id="inferred" checked={showInferredLinks} onCheckedChange={setShowInferredLinks} />
                  <Label htmlFor="inferred" className="text-xs">Inferred Links</Label>
                </div>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-500 inline-block" /> Physical FK</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block border-dashed border-t" /> Inferred</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diagram Canvas */}
        <TabsContent value="module" className="mt-0">
          <DiagramCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onEdgeClick={(_, edge) => {
              const rel = edge.data?.relationship as DbRelationship;
              if (rel) setSelectedRelationship(rel);
            }}
            tablesLoading={tablesLoading}
          />
        </TabsContent>
        <TabsContent value="expanded" className="mt-0">
          <DiagramCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
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
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
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
        <SheetContent className="w-[450px] sm:w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              {selectedTable?.table_name}
            </SheetTitle>
          </SheetHeader>
          {selectedTable && (
            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Badge variant="outline" className="mt-1">
                  {TABLE_CATEGORIES[selectedTable.table_category]?.label || selectedTable.table_category}
                </Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm">{selectedTable.description || 'No description available'}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Schema</Label>
                  <p>{selectedTable.schema_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <p>{selectedTable.is_view ? 'View' : 'Table'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Shared</Label>
                  <p>{selectedTable.is_shared ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Est. Rows</Label>
                  <p>{selectedTable.estimated_row_count?.toLocaleString() || 'N/A'}</p>
                </div>
              </div>
              <Separator />
              {selectedTable.primary_key_summary && (
                <div>
                  <Label className="text-xs text-muted-foreground">Primary Keys</Label>
                  <p className="text-sm font-mono bg-muted p-2 rounded">{selectedTable.primary_key_summary}</p>
                </div>
              )}
              {selectedTable.foreign_key_summary && (
                <div>
                  <Label className="text-xs text-muted-foreground">Foreign Keys</Label>
                  <p className="text-sm font-mono bg-muted p-2 rounded whitespace-pre-wrap">{selectedTable.foreign_key_summary}</p>
                </div>
              )}
              {selectedTable.index_summary && (
                <div>
                  <Label className="text-xs text-muted-foreground">Indexes</Label>
                  <p className="text-sm font-mono bg-muted p-2 rounded whitespace-pre-wrap">{selectedTable.index_summary}</p>
                </div>
              )}
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground">Relationships</Label>
                <div className="mt-1 space-y-1">
                  {relationships
                    .filter(r => r.source_table_id === selectedTable.id || r.target_table_id === selectedTable.id)
                    .map(r => {
                      const otherTableId = r.source_table_id === selectedTable.id ? r.target_table_id : r.source_table_id;
                      const otherTable = tables.find(t => t.id === otherTableId);
                      const direction = r.source_table_id === selectedTable.id ? '→' : '←';
                      return (
                        <div key={r.id} className="text-xs p-2 bg-muted rounded flex items-center gap-2">
                          <span className="font-mono">
                            {r.source_column} {direction} {otherTable?.table_name || 'unknown'}.{r.target_column}
                          </span>
                          {r.is_inferred && <Badge variant="secondary" className="text-[10px]">Inferred</Badge>}
                        </div>
                      );
                    })}
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
    </div>
  );
}

function DiagramCanvas({ nodes, edges, onNodesChange, onEdgesChange, onEdgeClick, tablesLoading }: any) {
  if (tablesLoading) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading diagram...</p>
        </div>
      </Card>
    );
  }

  if (!nodes.length) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No diagram data available</p>
          <p className="text-sm mt-1">Click "Reanalyze Module" to generate the diagram</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-[600px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Controls />
        <MiniMap
          nodeStrokeColor="#6366f1"
          nodeColor={(n) => (n.data as any)?.color || '#3b82f6'}
          nodeBorderRadius={4}
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
    </Card>
  );
}
