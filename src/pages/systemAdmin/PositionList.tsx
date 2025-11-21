import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit } from "lucide-react";
import { positions, orgUnits } from "@/services/mockData/systemAdminData";

export default function PositionList() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPositions = positions.filter(pos =>
    pos.positionName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOrgUnitName = (orgUnitId: string) => {
    return orgUnits.find(u => u.orgUnitId === orgUnitId)?.name || "N/A";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Position Management</h1>
          <p className="text-muted-foreground">Manage positions and reporting structure</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Position
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search positions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position Name</TableHead>
                <TableHead>Org Unit</TableHead>
                <TableHead>Grade/Level</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Approver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPositions.map((position) => (
                <TableRow key={position.positionId}>
                  <TableCell className="font-medium">{position.positionName}</TableCell>
                  <TableCell>{getOrgUnitName(position.orgUnitId)}</TableCell>
                  <TableCell>{position.gradeLevel}</TableCell>
                  <TableCell>
                    {position.isManager ? (
                      <Badge className="bg-blue-100 text-blue-800">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {position.isApprover ? (
                      <Badge className="bg-purple-100 text-purple-800">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {position.activeFlag ? (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                    )}
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
