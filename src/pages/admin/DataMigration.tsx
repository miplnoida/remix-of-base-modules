import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Database, 
  Download, 
  Upload, 
  Info, 
  CheckCircle, 
  AlertCircle,
  FileJson,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

// Table categorization rules (prefix-based matching)
const TABLE_CATEGORY_RULES: Record<string, { description: string; prefixes: string[]; exactMatches?: string[] }> = {
  Configuration: {
    description: "Core system configuration",
    prefixes: ["app_", "module_", "role", "password_", "mfa_", "api_"],
    exactMatches: ["roles"],
  },
  Organization: {
    description: "Organizational structure",
    prefixes: ["department", "designation", "office_"],
    exactMatches: ["departments", "designations"],
  },
  Workflows: {
    description: "Workflow definitions and runtime",
    prefixes: ["workflow_"],
  },
  Security: {
    description: "Data access and field security",
    prefixes: ["data_scope_", "field_security_", "data_policy_"],
  },
  Notifications: {
    description: "Notification settings and logs",
    prefixes: ["notification_", "in_app_notification"],
  },
  Users: {
    description: "User profiles and settings",
    prefixes: ["user_", "profile"],
    exactMatches: ["profiles"],
  },
  InsuredPersons: {
    description: "Insured Person Registration",
    prefixes: ["ip_", "tmp_ip_"],
  },
  Employers: {
    description: "Employer Registration",
    prefixes: ["er_"],
  },
  Legal: {
    description: "Legal case management",
    prefixes: ["legal_"],
  },
  Compliance: {
    description: "Compliance and audit data",
    prefixes: ["compliance_", "bema_", "c3_"],
  },
  MasterData: {
    description: "Master/lookup tables",
    prefixes: ["tb_"],
  },
  Inspectors: {
    description: "Inspector management",
    prefixes: ["inspector_"],
  },
  Contributions: {
    description: "Contributions and remittances",
    prefixes: ["contribution_", "contributor_", "remittance_", "payment_plan_"],
  },
  SystemLogs: {
    description: "System audit and logs",
    prefixes: ["audit_", "system_"],
  },
  SampleData: {
    description: "Sample application data",
    prefixes: ["sample_"],
    exactMatches: ["sample_applications"],
  },
};

// Categorize a table name
const categorizeTable = (tableName: string): string => {
  for (const [category, rules] of Object.entries(TABLE_CATEGORY_RULES)) {
    // Check exact matches first
    if (rules.exactMatches?.includes(tableName)) {
      return category;
    }
    // Check prefix matches
    for (const prefix of rules.prefixes) {
      if (tableName.startsWith(prefix)) {
        return category;
      }
    }
  }
  return "Other";
};

// Build categories from table list
const buildTableCategories = (tables: string[]): Record<string, { description: string; tables: string[] }> => {
  const categories: Record<string, { description: string; tables: string[] }> = {};
  
  // Initialize categories from rules
  for (const [category, rules] of Object.entries(TABLE_CATEGORY_RULES)) {
    categories[category] = { description: rules.description, tables: [] };
  }
  categories["Other"] = { description: "Other tables", tables: [] };
  
  // Categorize each table
  for (const table of tables) {
    const category = categorizeTable(table);
    categories[category].tables.push(table);
  }
  
  // Remove empty categories
  for (const category of Object.keys(categories)) {
    if (categories[category].tables.length === 0) {
      delete categories[category];
    }
  }
  
  // Sort tables within each category
  for (const category of Object.keys(categories)) {
    categories[category].tables.sort();
  }
  
  return categories;
};

// Ordered list for proper import (respecting foreign key dependencies)
// Tables should be imported in dependency order
const getTableImportOrder = (tables: string[]): string[] => {
  // Define priority prefixes (lower = higher priority, imported first)
  const priorityPrefixes = [
    "tb_",           // Master data first
    "roles",         // Core roles
    "app_",          // App config
    "module_",       // Module config
    "role_",         // Role config
    "password_",     // Password config
    "mfa_",          // MFA config
    "api_",          // API settings
    "office_",       // Offices
    "department",    // Departments
    "designation",   // Designations
    "workflow_def",  // Workflow definitions
    "workflow_step", // Workflow steps
    "workflow_",     // Other workflow
    "notification_", // Notifications
    "data_",         // Data rules
    "field_",        // Field rules
    "profile",       // Profiles
    "user_",         // Users
    "inspector_",    // Inspectors
    "er_",           // Employers
    "ip_",           // Insured persons
    "legal_",        // Legal
    "compliance_",   // Compliance
    "bema_",         // BEMA
    "c3_",           // C3
    "contribution_", // Contributions
    "audit_",        // Audit logs
    "system_",       // System logs
  ];
  
  return [...tables].sort((a, b) => {
    const aPriority = priorityPrefixes.findIndex(p => a.startsWith(p) || a === p.replace("_", ""));
    const bPriority = priorityPrefixes.findIndex(p => b.startsWith(p) || b === p.replace("_", ""));
    
    const aOrder = aPriority === -1 ? 999 : aPriority;
    const bOrder = bPriority === -1 ? 999 : bPriority;
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.localeCompare(b);
  });
};

interface ImportResult {
  table: string;
  success: boolean;
  inserted: number;
  error?: string;
}

const DataMigration = () => {
  const { toast } = useToast();
  const { user } = useSupabaseAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch all tables from database
  const [allTables, setAllTables] = useState<string[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const { data, error } = await supabase.rpc('get_all_public_tables');
        if (error) throw error;
        setAllTables((data || []).map((t: { table_name: string }) => t.table_name));
      } catch (err) {
        console.error('Failed to fetch tables:', err);
        // Fallback to empty - user can refresh
        setAllTables([]);
      } finally {
        setIsLoadingTables(false);
      }
    };
    fetchTables();
  }, []);
  
  // Build dynamic categories from fetched tables
  const tableCategories = useMemo(() => buildTableCategories(allTables), [allTables]);
  
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  
  // Initialize selected categories once tables are loaded
  useEffect(() => {
    if (Object.keys(tableCategories).length > 0 && selectedCategories.size === 0) {
      setSelectedCategories(new Set(Object.keys(tableCategories)));
    }
  }, [tableCategories]);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [exportComplete, setExportComplete] = useState(false);
  const [lastExportCount, setLastExportCount] = useState(0);

  const getSelectedTables = useCallback(() => {
    const tables: string[] = [];
    selectedCategories.forEach((category) => {
      const cat = tableCategories[category];
      if (cat) {
        tables.push(...cat.tables);
      }
    });
    return tables;
  }, [selectedCategories, tableCategories]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedCategories(new Set(Object.keys(tableCategories)));
  };

  const handleSelectNone = () => {
    setSelectedCategories(new Set());
  };

  const handleSelectConfig = () => {
    setSelectedCategories(new Set(["Configuration", "Organization", "Workflows", "Security", "MasterData"]));
  };
  
  const handleRefreshTables = async () => {
    setIsLoadingTables(true);
    try {
      const { data, error } = await supabase.rpc('get_all_public_tables');
      if (error) throw error;
      setAllTables((data || []).map((t: { table_name: string }) => t.table_name));
      toast({ title: "Tables Refreshed", description: `Found ${data?.length || 0} tables` });
    } catch (err) {
      console.error('Failed to fetch tables:', err);
      toast({ title: "Refresh Failed", variant: "destructive" });
    } finally {
      setIsLoadingTables(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportComplete(false);
    
    try {
      const tables = getSelectedTables();
      const exportData: Record<string, any> = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: user?.email || "unknown",
        projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID || "unknown",
        tableOrder: tables,
        meta: {},
        data: {},
      };

      let totalRecords = 0;

      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table as any)
            .select("*");

          if (error) {
            console.warn(`Error exporting ${table}:`, error.message);
            exportData.meta[table] = { count: 0, error: error.message };
            exportData.data[table] = [];
          } else {
            exportData.meta[table] = { count: data?.length || 0 };
            exportData.data[table] = data || [];
            totalRecords += data?.length || 0;
          }
        } catch (err) {
          console.warn(`Failed to export ${table}:`, err);
          exportData.meta[table] = { count: 0, error: "Export failed" };
          exportData.data[table] = [];
        }
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: "application/json" 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `seed-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastExportCount(totalRecords);
      setExportComplete(true);
      
      toast({
        title: "Export Complete",
        description: `Exported ${tables.length} tables with ${totalRecords} records`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred during export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResults([]);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportResults([]);

    try {
      const text = await importFile.text();
      const data = JSON.parse(text);

      if (!data.tableOrder || !data.data) {
        throw new Error("Invalid export file format");
      }

      setImportProgress(20);

      // Call the edge function for faster import with service role
      // Pass the full seed data object which contains tableOrder and data properties
      const { data: response, error } = await supabase.functions.invoke("import-seed-data", {
        body: { seedData: data },
      });

      setImportProgress(80);

      if (error) {
        throw new Error(error.message);
      }

      // Convert edge function response to our result format
      const results: ImportResult[] = [];
      if (response?.results) {
        for (const [table, result] of Object.entries(response.results as Record<string, { success: number; errors: string[] }>)) {
          results.push({
            table,
            success: result.errors.length === 0,
            inserted: result.success,
            error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
          });
        }
      }

      // Sort results by import order
      const importOrder = getTableImportOrder(results.map(r => r.table));
      results.sort((a, b) => {
        const aIndex = importOrder.indexOf(a.table);
        const bIndex = importOrder.indexOf(b.table);
        return aIndex - bIndex;
      });

      setImportResults(results);
      setImportProgress(100);
      
      const successCount = results.filter(r => r.success && r.inserted > 0).length;
      const failCount = results.filter(r => !r.success).length;
      const totalRecords = results.reduce((sum, r) => sum + r.inserted, 0);
      
      toast({
        title: "Import Complete",
        description: `${successCount} tables imported with ${totalRecords} total records${failCount > 0 ? `, ${failCount} had errors` : ""}`,
        variant: failCount > 0 ? "destructive" : "default",
      });
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "An error occurred during import",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleLoadSeedFile = async () => {
    try {
      const response = await fetch("/seed-data-2026-01-12-2.json");
      if (!response.ok) {
        throw new Error("Failed to load seed file");
      }
      const blob = await response.blob();
      const file = new File([blob], "seed-data-2026-01-12-2.json", { type: "application/json" });
      setImportFile(file);
      setImportResults([]);
      toast({
        title: "Seed File Loaded",
        description: "The seed data file is ready to import",
      });
    } catch (error: any) {
      toast({
        title: "Load Failed",
        description: error.message || "Failed to load seed file",
        variant: "destructive",
      });
    }
  };

  const totalSelectedTables = getSelectedTables().length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Database className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Migration</h1>
          <p className="text-muted-foreground">
            Export and import database data for migrating to remix projects
          </p>
        </div>
      </div>

      {/* Instructions Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold">How to use</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>
                  <strong>Export:</strong> Select categories and click "Export Data" to download a JSON file
                </li>
                <li>
                  <strong>Import:</strong> In your remix project, upload the JSON file and click "Start Import"
                </li>
                <li>
                  <span className="text-primary font-medium">Configuration data</span> (
                  <span className="text-primary">roles</span>,{" "}
                  <span className="text-primary">permissions</span>,{" "}
                  <span className="text-primary">workflows</span>) is recommended for migration
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>
              Select which data categories to export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Select Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={isLoadingTables}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleSelectNone} disabled={isLoadingTables}>
                Select None
              </Button>
              <Button variant="outline" size="sm" onClick={handleSelectConfig} disabled={isLoadingTables}>
                Config Only
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshTables} 
                disabled={isLoadingTables}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingTables ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Category Checkboxes */}
            <div className="space-y-3 border rounded-lg p-4 max-h-[400px] overflow-y-auto">
              {isLoadingTables ? (
                <div className="text-center py-4 text-muted-foreground">Loading tables...</div>
              ) : Object.keys(tableCategories).length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No tables found</div>
              ) : (
                Object.entries(tableCategories).map(([category, config]) => (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={category}
                        checked={selectedCategories.has(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <label
                        htmlFor={category}
                        className="text-sm font-medium cursor-pointer flex items-center gap-2"
                      >
                        {category}
                        <Badge variant="secondary" className="text-xs">
                          {config.tables.length} tables
                        </Badge>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      {config.tables.join(", ")}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              Selected: <strong>{totalSelectedTables} tables</strong>
            </div>

            <Button 
              className="w-full" 
              onClick={handleExport}
              disabled={isExporting || totalSelectedTables === 0}
            >
              {isExporting ? (
                <>Exporting...</>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </>
              )}
            </Button>

            {exportComplete && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Export Complete - Exported {lastExportCount} records successfully
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Data
            </CardTitle>
            <CardDescription>
              Upload an exported JSON file to import data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Load Seed File */}
            <Button 
              variant="outline" 
              className="w-full mb-4" 
              onClick={handleLoadSeedFile}
            >
              <FileJson className="mr-2 h-4 w-4" />
              Load Seed Data File
            </Button>

            {/* File Upload Area */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileJson className="h-12 w-12 mx-auto text-primary/60 mb-3" />
              {importFile ? (
                <p className="text-sm font-medium">{importFile.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click to select a <span className="text-primary font-medium">JSON</span> file
                </p>
              )}
            </div>

            <Button 
              className="w-full" 
              onClick={handleImport}
              disabled={isImporting || !importFile}
            >
              {isImporting ? (
                <>Importing...</>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Start Import
                </>
              )}
            </Button>

            {/* Import Progress */}
            {isImporting && (
              <div className="space-y-2">
                <Progress value={importProgress} />
                <p className="text-xs text-center text-muted-foreground">
                  {importProgress}% complete
                </p>
              </div>
            )}

            {/* Import Results */}
            {importResults.length > 0 && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                <h4 className="font-medium text-sm">Import Results:</h4>
                {importResults.map((result) => (
                  <div
                    key={result.table}
                    className={`flex items-center justify-between p-2 rounded text-sm ${
                      result.success 
                        ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200" 
                        : "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span>{result.table}</span>
                    </div>
                    <span>
                      {result.success 
                        ? `${result.inserted} records` 
                        : result.error?.substring(0, 50)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataMigration;
