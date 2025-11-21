import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertCircle, CheckCircle2, Save } from "lucide-react";

export const AvailabilityRouting = () => {
  const [selectedProcedure, setSelectedProcedure] = useState("SURG001");
  
  const [config, setConfig] = useState({
    availableLocally: true,
    availableRegionally: true,
    availableOverseas: true,
    requireLocalUnavailabilityForRegional: true,
    requireLocalRegionalUnavailabilityForOverseas: true,
    medicalBoardForRegional: false,
    medicalBoardForOverseas: true,
    allowDirectOverseas: false,
    overrideRole: "Chief Medical Officer",
    defaultRoute: "Local",
    notes: "Follow standard routing protocol unless medically justified."
  });

  const procedures = [
    { code: "SURG001", name: "Appendectomy" },
    { code: "SURG002", name: "Knee Replacement" },
    { code: "DIAG001", name: "MRI Scan" },
    { code: "TREAT001", name: "Chemotherapy" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Label>Select Procedure</Label>
        <Select value={selectedProcedure} onValueChange={setSelectedProcedure}>
          <SelectTrigger className="max-w-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {procedures.map((proc) => (
              <SelectItem key={proc.code} value={proc.code}>
                {proc.code} - {proc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Local Availability</h3>
          </div>
          <div className="flex items-center justify-between">
            <Label>Available Locally</Label>
            <Switch
              checked={config.availableLocally}
              onCheckedChange={(checked) => setConfig({...config, availableLocally: checked})}
            />
          </div>
          {config.availableLocally && (
            <Badge variant="default" className="w-full justify-center">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Available
            </Badge>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Regional Availability</h3>
          </div>
          <div className="flex items-center justify-between">
            <Label>Available Regionally</Label>
            <Switch
              checked={config.availableRegionally}
              onCheckedChange={(checked) => setConfig({...config, availableRegionally: checked})}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <Label>Require Local Unavailability Proof</Label>
            <Switch
              checked={config.requireLocalUnavailabilityForRegional}
              onCheckedChange={(checked) => setConfig({...config, requireLocalUnavailabilityForRegional: checked})}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <Label>Medical Board Approval Required</Label>
            <Switch
              checked={config.medicalBoardForRegional}
              onCheckedChange={(checked) => setConfig({...config, medicalBoardForRegional: checked})}
            />
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold">Overseas Availability</h3>
          </div>
          <div className="flex items-center justify-between">
            <Label>Available Overseas</Label>
            <Switch
              checked={config.availableOverseas}
              onCheckedChange={(checked) => setConfig({...config, availableOverseas: checked})}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <Label>Require Local/Regional Unavailability Proof</Label>
            <Switch
              checked={config.requireLocalRegionalUnavailabilityForOverseas}
              onCheckedChange={(checked) => setConfig({...config, requireLocalRegionalUnavailabilityForOverseas: checked})}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <Label>Medical Board Approval Required</Label>
            <Switch
              checked={config.medicalBoardForOverseas}
              onCheckedChange={(checked) => setConfig({...config, medicalBoardForOverseas: checked})}
            />
          </div>
        </Card>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold">Routing Behaviour</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default Recommended Route</Label>
            <Select value={config.defaultRoute} onValueChange={(value) => setConfig({...config, defaultRoute: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Local">Local First</SelectItem>
                <SelectItem value="Regional">Regional First</SelectItem>
                <SelectItem value="Overseas">Overseas First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Override Requires Role</Label>
            <Select value={config.overrideRole} onValueChange={(value) => setConfig({...config, overrideRole: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Supervisor">Supervisor</SelectItem>
                <SelectItem value="Chief Medical Officer">Chief Medical Officer</SelectItem>
                <SelectItem value="Director">Director</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>Allow Direct Overseas in Exceptional Cases</Label>
          <Switch
            checked={config.allowDirectOverseas}
            onCheckedChange={(checked) => setConfig({...config, allowDirectOverseas: checked})}
          />
        </div>

        <div className="space-y-2">
          <Label>Notes / Policy Reference</Label>
          <Textarea
            value={config.notes}
            onChange={(e) => setConfig({...config, notes: e.target.value})}
            placeholder="Enter policy notes, legislative references, or special conditions..."
            rows={3}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
};
