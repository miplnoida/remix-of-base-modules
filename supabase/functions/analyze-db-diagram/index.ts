import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { moduleCode, userEmail, scope } = await req.json();

    // 1. Get all public tables from information_schema
    const { data: rawTables } = await supabase.rpc("get_all_public_tables" as any);
    const allTableNames: string[] = (rawTables || []).map((t: any) => t.table_name);

    // 2. Get FK relationships from information_schema  
    const { data: fkData } = await supabase.rpc("get_table_foreign_keys" as any);
    const foreignKeys: any[] = fkData || [];

    // 3. Module mapping based on table prefixes
    const moduleMapping: Record<string, { code: string; name: string; tables: string[] }> = {};
    
    const prefixMap: Record<string, { code: string; name: string }> = {
      'bema_': { code: 'bema', name: 'BeMA Compliance' },
      'compliance_': { code: 'compliance', name: 'Compliance & Enforcement' },
      'legal_': { code: 'legal', name: 'Legal Management' },
      'c3_': { code: 'c3', name: 'C3 Management' },
      'workflow_': { code: 'workflow', name: 'Workflow Engine' },
      'ia_': { code: 'internal_audit', name: 'Internal Audit' },
      'ip_': { code: 'insured_person', name: 'Insured Persons' },
      'pblcnt_': { code: 'contributors', name: 'Contributors' },
      'employer': { code: 'employer', name: 'Employer Management' },
      'api_': { code: 'api', name: 'API Management' },
      'notification_': { code: 'notifications', name: 'Notifications' },
      'audit_': { code: 'audit', name: 'Audit & Logging' },
      'app_': { code: 'system', name: 'System Configuration' },
      'dev_info_': { code: 'developer_info', name: 'Developer Information' },
      'db_diagram_': { code: 'db_diagram', name: 'DB Diagram' },
      'user_': { code: 'users', name: 'User Management' },
      'sample_': { code: 'sample', name: 'Sample Applications' },
      'data_access_': { code: 'data_access', name: 'Data Access Control' },
      'public_api_': { code: 'public_api', name: 'Public API' },
      'tmp_': { code: 'temporary', name: 'Temporary / Staging' },
      'au_': { code: 'audit_legacy', name: 'Audit (Legacy)' },
    };

    // Classify each table
    for (const tableName of allTableNames) {
      let matched = false;
      for (const [prefix, info] of Object.entries(prefixMap)) {
        if (tableName.startsWith(prefix)) {
          if (!moduleMapping[info.code]) {
            moduleMapping[info.code] = { ...info, tables: [] };
          }
          moduleMapping[info.code].tables.push(tableName);
          matched = true;
          break;
        }
      }
      if (!matched) {
        if (!moduleMapping['core']) {
          moduleMapping['core'] = { code: 'core', name: 'Core / Master', tables: [] };
        }
        moduleMapping['core'].tables.push(tableName);
      }
    }

    // Filter if module scope
    const modulesToProcess = scope === 'enterprise'
      ? Object.values(moduleMapping)
      : Object.values(moduleMapping).filter(m => m.code === moduleCode || moduleCode === 'all');

    let totalTablesFound = 0;
    let totalRelFound = 0;

    for (const mod of modulesToProcess) {
      // Upsert module
      const { data: moduleRow } = await supabase
        .from("db_diagram_modules")
        .upsert({
          module_code: mod.code,
          module_name: mod.name,
          is_active: true,
          last_analyzed_at: new Date().toISOString(),
          last_analyzed_by: userEmail,
          current_version_no: 1,
        }, { onConflict: 'module_code' })
        .select()
        .single();

      if (!moduleRow) continue;
      const moduleId = moduleRow.id;

      // Upsert tables
      for (const tableName of mod.tables) {
        const category = classifyTable(tableName);
        const isShared = ['roles', 'user_profiles', 'app_modules', 'module_actions'].includes(tableName);
        
        // Get column info
        const { data: cols } = await supabase.rpc("get_table_columns" as any, { p_table_name: tableName });
        const columns = cols || [];
        const pks = columns.filter((c: any) => c.column_name === 'id').map((c: any) => c.column_name);
        const fks = foreignKeys
          .filter((fk: any) => fk.source_table === tableName)
          .map((fk: any) => `${fk.source_column} → ${fk.target_table}.${fk.target_column}`);

        const { data: tableRow } = await supabase
          .from("db_diagram_tables")
          .upsert({
            module_id: moduleId,
            schema_name: 'public',
            table_name: tableName,
            table_category: category,
            description: `${mod.name} table: ${tableName}`,
            is_physical_table: true,
            is_view: false,
            is_shared: isShared,
            primary_key_summary: pks.join(', ') || 'id',
            foreign_key_summary: fks.join('\n') || null,
            last_analyzed_at: new Date().toISOString(),
          }, { onConflict: 'schema_name,table_name' })
          .select()
          .single();

        if (tableRow) {
          totalTablesFound++;
          // Upsert table-module map
          await supabase.from("db_diagram_table_module_map").upsert({
            table_id: tableRow.id,
            module_id: moduleId,
            ownership_type: isShared ? 'shared' : 'primary',
            is_primary_owner: !isShared,
            confidence_score: 1.0,
          }, { onConflict: 'table_id,module_id' });
        }
      }

      // Process FK relationships for this module's tables
      for (const fk of foreignKeys) {
        if (!mod.tables.includes(fk.source_table)) continue;

        const { data: sourceTable } = await supabase
          .from("db_diagram_tables")
          .select("id")
          .eq("table_name", fk.source_table)
          .eq("schema_name", "public")
          .single();

        const { data: targetTable } = await supabase
          .from("db_diagram_tables")
          .select("id")
          .eq("table_name", fk.target_table)
          .eq("schema_name", "public")
          .single();

        if (sourceTable && targetTable) {
          await supabase.from("db_diagram_relationships").upsert({
            source_table_id: sourceTable.id,
            source_column: fk.source_column,
            target_table_id: targetTable.id,
            target_column: fk.target_column,
            relationship_type: 'foreign_key',
            is_physical_fk: true,
            is_inferred: false,
            cardinality: 'many-to-one',
            dependency_strength: 'strong',
            description: `FK: ${fk.source_table}.${fk.source_column} → ${fk.target_table}.${fk.target_column}`,
            last_analyzed_at: new Date().toISOString(),
          }, { onConflict: undefined });
          totalRelFound++;
        }
      }

      // Inferred relationships by naming convention
      for (const tableName of mod.tables) {
        const { data: cols } = await supabase.rpc("get_table_columns" as any, { p_table_name: tableName });
        for (const col of (cols || [])) {
          const colName = col.column_name;
          // Check for _id suffix patterns
          if (colName.endsWith('_id') && colName !== 'id') {
            const inferredTable = colName.replace(/_id$/, '') + 's';
            // Check if a known FK already exists
            const alreadyFK = foreignKeys.some(
              fk => fk.source_table === tableName && fk.source_column === colName
            );
            if (!alreadyFK && allTableNames.includes(inferredTable)) {
              const { data: src } = await supabase.from("db_diagram_tables").select("id").eq("table_name", tableName).eq("schema_name", "public").single();
              const { data: tgt } = await supabase.from("db_diagram_tables").select("id").eq("table_name", inferredTable).eq("schema_name", "public").single();
              if (src && tgt) {
                await supabase.from("db_diagram_relationships").insert({
                  source_table_id: src.id,
                  source_column: colName,
                  target_table_id: tgt.id,
                  target_column: 'id',
                  relationship_type: 'inferred_naming',
                  is_physical_fk: false,
                  is_inferred: true,
                  cardinality: 'many-to-one',
                  dependency_strength: 'weak',
                  description: `Inferred from column naming: ${colName}`,
                });
                totalRelFound++;
              }
            }
          }
        }
      }
    }

    // Build module dependencies
    if (scope === 'enterprise' || moduleCode === 'all') {
      const { data: allRels } = await supabase.from("db_diagram_relationships").select("source_table_id, target_table_id");
      const { data: allTableData } = await supabase.from("db_diagram_tables").select("id, module_id");
      
      if (allRels && allTableData) {
        const tableModuleMap = new Map(allTableData.map((t: any) => [t.id, t.module_id]));
        const depPairs = new Set<string>();

        for (const rel of allRels) {
          const srcMod = tableModuleMap.get(rel.source_table_id);
          const tgtMod = tableModuleMap.get(rel.target_table_id);
          if (srcMod && tgtMod && srcMod !== tgtMod) {
            const key = `${srcMod}|${tgtMod}`;
            if (!depPairs.has(key)) {
              depPairs.add(key);
              await supabase.from("db_diagram_module_dependencies").upsert({
                source_module_id: srcMod,
                target_module_id: tgtMod,
                dependency_type: 'data',
                criticality: 'medium',
                last_analyzed_at: new Date().toISOString(),
              }, { onConflict: 'source_module_id,target_module_id' });
            }
          }
        }
      }
    }

    // Log analysis
    const duration = Date.now() - startTime;
    let logModuleId = null;
    if (moduleCode && moduleCode !== 'all') {
      const { data: m } = await supabase.from("db_diagram_modules").select("id").eq("module_code", moduleCode).single();
      logModuleId = m?.id;
    }

    await supabase.from("db_diagram_analysis_logs").insert({
      module_id: logModuleId,
      triggered_by: userEmail,
      analysis_scope: scope,
      status: 'completed',
      tables_found: totalTablesFound,
      relationships_found: totalRelFound,
      duration_ms: duration,
    });

    return new Response(JSON.stringify({
      success: true,
      tables_found: totalTablesFound,
      relationships_found: totalRelFound,
      duration_ms: duration,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("analyze-db-diagram error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function classifyTable(name: string): string {
  if (name.startsWith('au_') || name.startsWith('audit_') || name.includes('_log') || name.includes('_logs')) return 'audit_log';
  if (name.startsWith('tmp_')) return 'temporary_work';
  if (name.includes('_map') || name.includes('_assignments') || name.includes('_scope_')) return 'bridge_junction';
  if (name === 'roles' || name === 'user_profiles' || name === 'app_modules' || name === 'module_actions') return 'core_master';
  if (name.includes('_config') || name.includes('_settings') || name.includes('_types') || name.includes('_rules')) return 'reference_lookup';
  return 'module_primary';
}
