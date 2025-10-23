import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Edit, Plus, Settings } from "lucide-react";

export default function HeadServiceConfig() {
  const [services, setServices] = useState([
    {
      id: 1,
      code: "SS-CONT",
      name: "Social Security Contribution",
      category: "Contribution",
      glAccount: "2200-001",
      fund: "Social Security Fund",
      periodicity: "Monthly",
      penaltyEnabled: true,
      penaltyRate: 5.0,
      active: true
    },
    {
      id: 2,
      code: "LEVY",
      name: "Education Levy",
      category: "Contribution",
      glAccount: "2200-002",
      fund: "Levy Fund",
      periodicity: "Monthly",
      penaltyEnabled: true,
      penaltyRate: 5.0,
      active: true
    },
    {
      id: 3,
      code: "RENT",
      name: "Property Rental",
      category: "Revenue",
      glAccount: "4100-001",
      fund: "Rental Fund",
      periodicity: "Monthly",
      penaltyEnabled: true,
      penaltyRate: 10.0,
      active: true
    },
    {
      id: 4,
      code: "ID-REPL",
      name: "ID Card Replacement",
      category: "Service",
      glAccount: "4200-001",
      fund: "Other Revenue",
      periodicity: "One-time",
      penaltyEnabled: false,
      penaltyRate: 0,
      active: true
    }
  ]);

  const [newService, setNewService] = useState({
    code: "",
    name: "",
    category: "",
    glAccount: "",
    fund: "",
    periodicity: "",
    penaltyEnabled: false,
    penaltyRate: 0
  });

  const handleSaveService = () => {
    if (!newService.code || !newService.name || !newService.category) {
      toast.error("Please fill in required fields");
      return;
    }

    setServices([...services, {
      id: services.length + 1,
      ...newService,
      active: true
    }]);

    setNewService({
      code: "",
      name: "",
      category: "",
      glAccount: "",
      fund: "",
      periodicity: "",
      penaltyEnabled: false,
      penaltyRate: 0
    });

    toast.success("Service head added successfully");
  };

  const toggleServiceStatus = (id: number) => {
    setServices(services.map(s => 
      s.id === id ? { ...s, active: !s.active } : s
    ));
    toast.info("Service status updated");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Head/Service Configuration</h1>
        <p className="text-muted-foreground">Manage payment heads and service definitions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Service Head</CardTitle>
          <CardDescription>Define a new payment head or service type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Service Code *</Label>
              <Input 
                placeholder="e.g., PEN-LETT"
                value={newService.code}
                onChange={(e) => setNewService({...newService, code: e.target.value.toUpperCase()})}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Service Name *</Label>
              <Input 
                placeholder="e.g., Pension Letter"
                value={newService.name}
                onChange={(e) => setNewService({...newService, name: e.target.value})}
              />
            </div>

            <div>
              <Label>Category *</Label>
              <Select value={newService.category} onValueChange={(v) => setNewService({...newService, category: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contribution">Contribution</SelectItem>
                  <SelectItem value="Revenue">Revenue</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                  <SelectItem value="Penalty">Penalty</SelectItem>
                  <SelectItem value="Interest">Interest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>GL Account</Label>
              <Input 
                placeholder="e.g., 4200-002"
                value={newService.glAccount}
                onChange={(e) => setNewService({...newService, glAccount: e.target.value})}
              />
            </div>

            <div>
              <Label>Fund Category</Label>
              <Select value={newService.fund} onValueChange={(v) => setNewService({...newService, fund: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fund" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Social Security Fund">Social Security Fund</SelectItem>
                  <SelectItem value="Levy Fund">Levy Fund</SelectItem>
                  <SelectItem value="PE Fund">PE Fund</SelectItem>
                  <SelectItem value="Rental Fund">Rental Fund</SelectItem>
                  <SelectItem value="Loan Repayment">Loan Repayment</SelectItem>
                  <SelectItem value="Other Revenue">Other Revenue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Periodicity</Label>
              <Select value={newService.periodicity} onValueChange={(v) => setNewService({...newService, periodicity: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select periodicity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Annually">Annually</SelectItem>
                  <SelectItem value="One-time">One-time</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={newService.penaltyEnabled}
                onCheckedChange={(v) => setNewService({...newService, penaltyEnabled: v})}
              />
              <Label>Enable Penalties</Label>
            </div>

            {newService.penaltyEnabled && (
              <div>
                <Label>Default Penalty Rate (%)</Label>
                <Input 
                  type="number"
                  step="0.1"
                  placeholder="5.0"
                  value={newService.penaltyRate}
                  onChange={(e) => setNewService({...newService, penaltyRate: parseFloat(e.target.value) || 0})}
                />
              </div>
            )}
          </div>

          <Button onClick={handleSaveService} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Service Head
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured Service Heads</CardTitle>
          <CardDescription>All payment heads and services in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>GL Account</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead>Periodicity</TableHead>
                <TableHead>Penalty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-mono font-semibold">{service.code}</TableCell>
                  <TableCell>{service.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{service.category}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{service.glAccount}</TableCell>
                  <TableCell className="text-sm">{service.fund}</TableCell>
                  <TableCell>{service.periodicity}</TableCell>
                  <TableCell>
                    {service.penaltyEnabled ? (
                      <span className="text-sm">{service.penaltyRate}%</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={service.active}
                      onCheckedChange={() => toggleServiceStatus(service.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
