import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, ChevronRight, ChevronDown } from "lucide-react";
import { orgUnits } from "@/services/mockData/systemAdminData";
import { OrgUnit } from "@/types/systemAdmin";
import { useToast } from "@/hooks/use-toast";
import { OrgUnitFormDialog } from "@/components/systemAdmin/OrgUnitFormDialog";

export default function OrgUnitList() {
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set(["ORG001"]));
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<OrgUnit | undefined>();

  const toggleExpand = (unitId: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  const renderOrgUnit = (unit: OrgUnit, level: number = 0) => {
    const children = orgUnits.filter(u => u.parentOrgUnitId === unit.orgUnitId);
    const hasChildren = children.length > 0;
    const isExpanded = expandedUnits.has(unit.orgUnitId);

    return (
      <div key={unit.orgUnitId}>
        <div
          className={`flex items-center justify-between p-3 border-b hover:bg-muted/50 transition-colors`}
          style={{ paddingLeft: `${level * 2 + 1}rem` }}
        >
          <div className="flex items-center gap-3 flex-1">
            {hasChildren && (
              <button
                onClick={() => toggleExpand(unit.orgUnitId)}
                className="text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
            {!hasChildren && <div className="w-4" />}
            <div>
              <div className="font-medium">{unit.name}</div>
              <Badge variant="outline" className="text-xs mt-1">{unit.type}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unit.activeFlag ? (
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => { setSelectedUnit(unit); setFormOpen(true); }}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {hasChildren && isExpanded && children.map(child => renderOrgUnit(child, level + 1))}
      </div>
    );
  };

  const rootUnits = orgUnits.filter(u => !u.parentOrgUnitId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Organisation Structure</h1>
          <p className="text-muted-foreground">Manage organisational units and hierarchy</p>
        </div>
        <Button onClick={() => { setSelectedUnit(undefined); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Unit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organisation Units</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rootUnits.map(unit => renderOrgUnit(unit))}
        </CardContent>
      </Card>

      <OrgUnitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        orgUnit={selectedUnit}
        onSave={(unit) => {
          toast({
            title: selectedUnit ? "Unit Updated" : "Unit Created",
            description: `Organisation unit ${unit.name} has been ${selectedUnit ? "updated" : "created"} successfully.`,
          });
        }}
      />
    </div>
  );
}
