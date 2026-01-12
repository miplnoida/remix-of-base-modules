import { useState, useCallback, useRef } from "react";
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
  FileJson
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

// Table categories for organized export
const TABLE_CATEGORIES = {
  Configuration: {
    description: "Core system configuration",
    tables: [
      "roles",
      "app_modules",
      "module_actions",
      "module_tables",
      "role_permissions",
      "role_hierarchy",
      "password_policies",
      "mfa_config",
    ],
  },
  Organization: {
    description: "Organizational structure",
    tables: [
      "departments",
      "designations",
      "designation_hierarchy",
      "office_locations",
      "office_departments",
    ],
  },
  Workflows: {
    description: "Workflow definitions and steps",
    tables: [
      "workflow_definitions",
      "workflow_steps",
      "workflow_step_actions",
      "workflow_triggers",
      "workflow_action_notifications",
    ],
  },
  Security: {
    description: "Data access and field security",
    tables: [
      "data_scope_rules",
      "field_security_rules",
    ],
  },
  Notifications: {
    description: "Notification settings",
    tables: [
      "notification_providers",
      "notification_templates",
    ],
  },
  Users: {
    description: "User profiles and settings",
    tables: [
      "profiles",
      "user_roles",
      "user_notification_preferences",
      "user_permission_overrides",
      "user_data_overrides",
      "user_sessions",
    ],
  },
  WorkflowInstances: {
    description: "Active workflow instances",
    tables: [
      "workflow_instances",
      "workflow_tasks",
      "workflow_task_history",
      "workflow_security_audit_log",
    ],
  },
  SampleData: {
    description: "Sample application data",
    tables: [
      "sample_applications",
    ],
  },
};

// Ordered list for proper import (respecting foreign key dependencies)
const TABLE_IMPORT_ORDER = [
  // Configuration (no dependencies)
  "roles",
  "app_modules",
  "module_actions",
  "module_tables",
  "role_permissions",
  "role_hierarchy",
  "password_policies",
  "mfa_config",
  // Organization
  "office_locations",
  "departments",
  "designations",
  "designation_hierarchy",
  "office_departments",
  // Workflows
  "workflow_definitions",
  "workflow_steps",
  "workflow_step_actions",
  "workflow_triggers",
  "workflow_action_notifications",
  // Security
  "data_scope_rules",
  "field_security_rules",
  // Notifications
  "notification_providers",
  "notification_templates",
  // Users (depends on above)
  "profiles",
  "user_roles",
  "user_notification_preferences",
  "user_permission_overrides",
  "user_data_overrides",
  "user_sessions",
  // Workflow instances (depends on definitions + users)
  "workflow_instances",
  "workflow_tasks",
  "workflow_task_history",
  "workflow_security_audit_log",
  // Sample data
  "sample_applications",
];

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
  
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(Object.keys(TABLE_CATEGORIES))
  );
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
      const cat = TABLE_CATEGORIES[category as keyof typeof TABLE_CATEGORIES];
      if (cat) {
        tables.push(...cat.tables);
      }
    });
    return tables;
  }, [selectedCategories]);

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
    setSelectedCategories(new Set(Object.keys(TABLE_CATEGORIES)));
  };

  const handleSelectNone = () => {
    setSelectedCategories(new Set());
  };

  const handleSelectConfig = () => {
    setSelectedCategories(new Set(["Configuration", "Organization", "Workflows", "Security"]));
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
      const { data: response, error } = await supabase.functions.invoke("import-seed-data", {
        body: { data },
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
      results.sort((a, b) => {
        const aIndex = TABLE_IMPORT_ORDER.indexOf(a.table);
        const bIndex = TABLE_IMPORT_ORDER.indexOf(b.table);
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
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleSelectNone}>
                Select None
              </Button>
              <Button variant="outline" size="sm" onClick={handleSelectConfig}>
                Config Only
              </Button>
            </div>

            {/* Category Checkboxes */}
            <div className="space-y-3 border rounded-lg p-4 max-h-[400px] overflow-y-auto">
              {Object.entries(TABLE_CATEGORIES).map(([category, config]) => (
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
              ))}
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
