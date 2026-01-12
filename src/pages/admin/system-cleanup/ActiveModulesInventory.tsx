import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Search, CheckCircle, XCircle, Layers, RefreshCw, Download, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Module {
  id: string;
  name: string;
  display_name: string;
  route: string | null;
  parent_id: string | null;
  parent_name?: string;
  is_enabled: boolean;
  icon: string | null;
  sort_order: number | null;
  description: string | null;
  children?: Module[];
}

export default function ActiveModulesInventory() {
  const [modules, setModules] = useState<Module[]>([]);
  const [flatModules, setFlatModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchModules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_modules')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Create a map for quick parent lookup
      const moduleMap = new Map<string, Module>();
      (data || []).forEach(m => {
        moduleMap.set(m.id, { ...m, children: [] });
      });

      // Build flat list with parent names
      const flat: Module[] = [];
      (data || []).forEach(m => {
        const parentModule = m.parent_id ? moduleMap.get(m.parent_id) : null;
        flat.push({
          ...m,
          parent_name: parentModule?.display_name || null
        });
      });
      setFlatModules(flat);

      // Build hierarchical structure
      const rootModules: Module[] = [];
      moduleMap.forEach(module => {
        if (module.parent_id) {
          const parent = moduleMap.get(module.parent_id);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(module);
          }
        } else {
          rootModules.push(module);
        }
      });

      setModules(rootModules);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch modules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const filteredModules = flatModules.filter(m =>
    m.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.route && m.route.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const enabledCount = flatModules.filter(m => m.is_enabled).length;
  const disabledCount = flatModules.filter(m => !m.is_enabled).length;
  const parentCount = flatModules.filter(m => !m.parent_id).length;
  const childCount = flatModules.filter(m => m.parent_id).length;

  const exportInventory = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      summary: {
        total: flatModules.length,
        enabled: enabledCount,
        disabled: disabledCount,
        parentModules: parentCount,
        childModules: childCount
      },
      modules: flatModules.map(m => ({
        name: m.name,
        displayName: m.display_name,
        route: m.route,
        parentModule: m.parent_name,
        isEnabled: m.is_enabled,
        icon: m.icon
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modules-inventory-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Modules inventory exported successfully'
    });
  };

  const renderModuleTree = (moduleList: Module[], depth = 0) => {
    return moduleList.map(module => (
      <React.Fragment key={module.id}>
        <TableRow className={depth > 0 ? 'bg-muted/30' : ''}>
          <TableCell style={{ paddingLeft: `${depth * 24 + 16}px` }}>
            <div className="flex items-center gap-2">
              {depth > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <span className="font-medium">{module.display_name}</span>
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground font-mono text-sm">{module.name}</TableCell>
          <TableCell className="text-muted-foreground text-sm">{module.route || '—'}</TableCell>
          <TableCell>
            {module.is_enabled ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" /> Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" /> Disabled
              </Badge>
            )}
          </TableCell>
          <TableCell className="text-muted-foreground text-sm">
            {module.children?.length || 0} sub-modules
          </TableCell>
        </TableRow>
        {module.children && module.children.length > 0 && renderModuleTree(module.children, depth + 1)}
      </React.Fragment>
    ));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Active Modules Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Review all modules currently configured in the application
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchModules} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportInventory}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flatModules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{enabledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{disabledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Parent/Child</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parentCount} / {childCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Modules Registry
              </CardTitle>
              <CardDescription>
                All modules registered in the app_modules table with their hierarchy
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search modules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="hierarchy">
            <TabsList>
              <TabsTrigger value="hierarchy">Hierarchy View</TabsTrigger>
              <TabsTrigger value="flat">Flat View</TabsTrigger>
            </TabsList>

            <TabsContent value="hierarchy" className="mt-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading modules...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Display Name</TableHead>
                        <TableHead>System Name</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Children</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {renderModuleTree(modules)}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="flat" className="mt-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading modules...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Display Name</TableHead>
                        <TableHead>System Name</TableHead>
                        <TableHead>Parent Module</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredModules.map(module => (
                        <TableRow key={module.id}>
                          <TableCell className="font-medium">{module.display_name}</TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">{module.name}</TableCell>
                          <TableCell className="text-muted-foreground">{module.parent_name || '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{module.route || '—'}</TableCell>
                          <TableCell>
                            {module.is_enabled ? (
                              <Badge variant="default" className="bg-green-600">Enabled</Badge>
                            ) : (
                              <Badge variant="secondary">Disabled</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
