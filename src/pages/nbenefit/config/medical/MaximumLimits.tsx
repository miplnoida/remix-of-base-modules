import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Save, MapPin, Plane, Hotel, Utensils } from "lucide-react";

export const MaximumLimits = () => {
  const [selectedProcedure, setSelectedProcedure] = useState("SURG001");

  const procedures = [
    { code: "SURG001", name: "Appendectomy" },
    { code: "SURG002", name: "Knee Replacement" },
    { code: "DIAG001", name: "MRI Scan" },
    { code: "TREAT001", name: "Chemotherapy" },
  ];

  const [localLimits, setLocalLimits] = useState({
    treatmentMax: "5000",
    hospitalMaxDays: "7",
    hospitalMaxAmount: "2000",
    travelMax: "0",
    accommodationMax: "0",
    dailyAllowance: "0",
    companionAllowed: false,
    companionMax: "0"
  });

  const [regionalLimits, setRegionalLimits] = useState({
    treatmentMax: "15000",
    hospitalMaxDays: "14",
    hospitalMaxAmount: "5000",
    travelMax: "2000",
    accommodationMax: "3000",
    dailyAllowance: "150",
    companionAllowed: true,
    companionMax: "1500"
  });

  const [overseasLimits, setOverseasLimits] = useState({
    treatmentMax: "50000",
    hospitalMaxDays: "30",
    hospitalMaxAmount: "20000",
    travelMax: "5000",
    accommodationMax: "10000",
    dailyAllowance: "300",
    companionAllowed: true,
    companionMax: "3000"
  });

  const LimitForm = ({ limits, setLimits, location, icon: Icon, color }: any) => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${color}`} />
        <h3 className="text-lg font-semibold">{location} Treatment Limits</h3>
        <Badge>XCD (Eastern Caribbean Dollar)</Badge>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <h4 className="font-semibold">Treatment & Hospital Costs</h4>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Treatment Maximum (XCD)</Label>
            <Input
              type="number"
              value={limits.treatmentMax}
              onChange={(e) => setLimits({...limits, treatmentMax: e.target.value})}
              placeholder="e.g., 5000"
            />
          </div>
          <div className="space-y-2">
            <Label>Hospital Stay Max Days</Label>
            <Input
              type="number"
              value={limits.hospitalMaxDays}
              onChange={(e) => setLimits({...limits, hospitalMaxDays: e.target.value})}
              placeholder="e.g., 7"
            />
          </div>
          <div className="space-y-2">
            <Label>Hospital Stay Max Amount (XCD)</Label>
            <Input
              type="number"
              value={limits.hospitalMaxAmount}
              onChange={(e) => setLimits({...limits, hospitalMaxAmount: e.target.value})}
              placeholder="e.g., 2000"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Plane className="h-4 w-4 text-blue-600" />
          <h4 className="font-semibold">Travel & Accommodation</h4>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Travel Maximum (XCD)</Label>
            <Input
              type="number"
              value={limits.travelMax}
              onChange={(e) => setLimits({...limits, travelMax: e.target.value})}
              placeholder="e.g., 2000"
            />
          </div>
          <div className="space-y-2">
            <Label>Accommodation Maximum (XCD)</Label>
            <Input
              type="number"
              value={limits.accommodationMax}
              onChange={(e) => setLimits({...limits, accommodationMax: e.target.value})}
              placeholder="e.g., 3000"
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Utensils className="h-4 w-4 text-amber-600" />
          <h4 className="font-semibold">Daily Allowance & Companion</h4>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Daily Subsistence Allowance (XCD)</Label>
            <Input
              type="number"
              value={limits.dailyAllowance}
              onChange={(e) => setLimits({...limits, dailyAllowance: e.target.value})}
              placeholder="e.g., 150"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <Label>Companion Allowed</Label>
              <Switch
                checked={limits.companionAllowed}
                onCheckedChange={(checked) => setLimits({...limits, companionAllowed: checked})}
              />
            </div>
            {limits.companionAllowed && (
              <div className="space-y-2">
                <Label>Companion Maximum (XCD)</Label>
                <Input
                  type="number"
                  value={limits.companionMax}
                  onChange={(e) => setLimits({...limits, companionMax: e.target.value})}
                  placeholder="e.g., 1500"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Reset to Defaults</Button>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save {location} Limits
        </Button>
      </div>
    </div>
  );

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

      <Tabs defaultValue="local" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="local">Local</TabsTrigger>
          <TabsTrigger value="regional">Regional</TabsTrigger>
          <TabsTrigger value="overseas">Overseas</TabsTrigger>
        </TabsList>

        <TabsContent value="local">
          <LimitForm 
            limits={localLimits} 
            setLimits={setLocalLimits} 
            location="Local"
            icon={MapPin}
            color="text-primary"
          />
        </TabsContent>

        <TabsContent value="regional">
          <LimitForm 
            limits={regionalLimits} 
            setLimits={setRegionalLimits} 
            location="Regional"
            icon={MapPin}
            color="text-blue-600"
          />
        </TabsContent>

        <TabsContent value="overseas">
          <LimitForm 
            limits={overseasLimits} 
            setLimits={setOverseasLimits} 
            location="Overseas"
            icon={Plane}
            color="text-orange-600"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
