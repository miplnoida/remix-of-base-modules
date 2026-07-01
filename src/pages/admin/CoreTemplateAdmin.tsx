import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CoreTemplateManagement from "@/components/templates/CoreTemplateManagement";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { coreTemplateBridgeService } from "@/services/coreTemplateBridgeService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { coreTemplateService, CoreTemplateUsage } from "@/services/coreTemplateService";

export default function CoreTemplateAdmin() {
  const { toast } = useToast();
  const [usage, setUsage] = useState<CoreTemplateUsage[]>([]);
  const [searchParams] = useSearchParams();
  // Preset filters via URL: ?type=EMAIL&channel=EMAIL&module=LEGAL
  const presetType = searchParams.get("type") || undefined;
  const presetChannel = searchParams.get("channel") || undefined;
  const presetModule = searchParams.get("module") || undefined;

  useEffect(() => {
    coreTemplateService.listUsage().then(setUsage).catch(() => {});
  }, []);

  const importLegacy = async () => {
    try {
      const res = await coreTemplateBridgeService.mirrorLegacyIntoCore();
      toast({ title: "Legacy Compliance templates mirrored", description: `Created ${res.created}, skipped ${res.skipped}` });
    } catch (e: any) {
      toast({ title: "Mirror failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <CoreTemplateManagement
        title="Core Template Designer"
        description="Single authoring surface for every module. Filter by module, type, channel, event, or language."
        showAllModules
        fixedModuleCode={presetModule}
        presetType={presetType}
        presetChannel={presetChannel}
      />


      <div className="container mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Compliance Legacy Bridge</CardTitle>
            <CardDescription>
              Mirror existing <code>ce_audit_communication_templates</code> into the core catalogue as read-only entries.
              Compliance runtime continues to use its own framework unchanged.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={importLegacy}>Mirror Legacy Compliance Templates</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template Usage Map ({usage.length})</CardTitle>
            <CardDescription>Where each template is used across the system</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Feature Area</TableHead>
                <TableHead>Screen</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Active</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {usage.map(u => (
                  <TableRow key={u.id}>
                    <TableCell><Badge variant="outline">{u.module_code}</Badge></TableCell>
                    <TableCell>{u.feature_area || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{u.screen_code || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{u.entity_type || "-"}</TableCell>
                    <TableCell>{u.trigger_event || "-"}</TableCell>
                    <TableCell>{u.is_active ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
