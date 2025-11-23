import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gavel, Plus, Edit, Users } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Court {
  courtId: string;
  courtName: string;
  courtType: string;
  location: string;
  territory: "St Kitts" | "Nevis";
  address: string;
  phone: string;
  active: boolean;
}

interface Judge {
  judgeId: string;
  judgeName: string;
  title: string;
  court: string;
  territory: "St Kitts" | "Nevis";
  active: boolean;
}

const mockCourts: Court[] = [
  {
    courtId: "CRT-001",
    courtName: "High Court",
    courtType: "High Court",
    location: "Basseterre",
    territory: "St Kitts",
    address: "Church Street, Basseterre",
    phone: "(869) 465-2521",
    active: true
  },
  {
    courtId: "CRT-002",
    courtName: "Magistrate Court",
    courtType: "Magistrate",
    location: "Basseterre",
    territory: "St Kitts",
    address: "Cayon Street, Basseterre",
    phone: "(869) 465-2241",
    active: true
  },
  {
    courtId: "CRT-003",
    courtName: "High Court Nevis Circuit",
    courtType: "High Court",
    location: "Charlestown",
    territory: "Nevis",
    address: "Court House Road, Charlestown",
    phone: "(869) 469-5521",
    active: true
  }
];

const mockJudges: Judge[] = [
  {
    judgeId: "JDG-001",
    judgeName: "Williams",
    title: "Hon. Justice",
    court: "High Court - St Kitts",
    territory: "St Kitts",
    active: true
  },
  {
    judgeId: "JDG-002",
    judgeName: "Brown",
    title: "Hon. Magistrate",
    court: "Magistrate Court - St Kitts",
    territory: "St Kitts",
    active: true
  },
  {
    judgeId: "JDG-003",
    judgeName: "Thompson",
    title: "Hon. Justice",
    court: "High Court Nevis Circuit",
    territory: "Nevis",
    active: true
  }
];

const CourtsJudges = () => {
  const { toast } = useToast();
  const [isCourtDialogOpen, setIsCourtDialogOpen] = useState(false);
  const [isJudgeDialogOpen, setIsJudgeDialogOpen] = useState(false);

  const handleAddCourt = () => {
    toast({
      title: "Court Added",
      description: "Court has been successfully added",
    });
    setIsCourtDialogOpen(false);
  };

  const handleAddJudge = () => {
    toast({
      title: "Judge Added",
      description: "Judge has been successfully added",
    });
    setIsJudgeDialogOpen(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Courts & Judges"
        subtitle="Manage court and judge master data"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/dashboard" },
          { label: "Legal Settings" },
          { label: "Courts & Judges" }
        ]}
      />

      <Tabs defaultValue="courts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="courts">Courts</TabsTrigger>
          <TabsTrigger value="judges">Judges</TabsTrigger>
        </TabsList>

        <TabsContent value="courts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Court Registry</h3>
            <Dialog open={isCourtDialogOpen} onOpenChange={setIsCourtDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Court
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Court</DialogTitle>
                  <DialogDescription>Enter court details</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Court Name *</Label>
                    <Input placeholder="e.g., High Court" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Court Type *</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High Court</SelectItem>
                          <SelectItem value="magistrate">Magistrate Court</SelectItem>
                          <SelectItem value="appeal">Court of Appeal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Territory *</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sk">St Kitts</SelectItem>
                          <SelectItem value="nv">Nevis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input placeholder="City/Town" />
                  </div>

                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input placeholder="Full address" />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input placeholder="(869) XXX-XXXX" />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsCourtDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddCourt}>Add Court</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Court Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Territory</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockCourts.map((court) => (
                    <TableRow key={court.courtId}>
                      <TableCell className="font-medium">{court.courtName}</TableCell>
                      <TableCell>{court.courtType}</TableCell>
                      <TableCell>{court.location}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{court.territory}</Badge>
                      </TableCell>
                      <TableCell>{court.phone}</TableCell>
                      <TableCell>
                        <Badge variant={court.active ? "default" : "secondary"}>
                          {court.active ? "Active" : "Inactive"}
                        </Badge>
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
        </TabsContent>

        <TabsContent value="judges" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Judge Registry</h3>
            <Dialog open={isJudgeDialogOpen} onOpenChange={setIsJudgeDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Judge
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Judge</DialogTitle>
                  <DialogDescription>Enter judge details</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="justice">Hon. Justice</SelectItem>
                          <SelectItem value="magistrate">Hon. Magistrate</SelectItem>
                          <SelectItem value="judge">Hon. Judge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Judge Name *</Label>
                      <Input placeholder="Last name" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Court *</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {mockCourts.map(court => (
                            <SelectItem key={court.courtId} value={court.courtId}>
                              {court.courtName} - {court.territory}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Territory *</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sk">St Kitts</SelectItem>
                          <SelectItem value="nv">Nevis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsJudgeDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddJudge}>Add Judge</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title & Name</TableHead>
                    <TableHead>Court</TableHead>
                    <TableHead>Territory</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockJudges.map((judge) => (
                    <TableRow key={judge.judgeId}>
                      <TableCell className="font-medium">
                        {judge.title} {judge.judgeName}
                      </TableCell>
                      <TableCell>{judge.court}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{judge.territory}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={judge.active ? "default" : "secondary"}>
                          {judge.active ? "Active" : "Inactive"}
                        </Badge>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourtsJudges;
