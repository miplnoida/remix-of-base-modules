import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, Edit, Trash2, MoreHorizontal } from "lucide-react";

// Mock data for the Manage C3 table
const mockC3Data = [
  {
    payerId: "EMP001",
    scheduleNo: "SCH-2024-001",
    period: "2024-01",
    dateReceived: "2024-01-15",
    enteredBy: "John Smith",
    verifiedBy: "Jane Doe",
    dateEntered: "2024-01-16",
    dateVerified: "2024-01-17",
    status: "Verified",
    payerName: "ABC Company Ltd"
  },
  {
    payerId: "SE002",
    scheduleNo: "SCH-2024-002",
    period: "2024-01",
    dateReceived: "2024-01-14",
    enteredBy: "Mike Johnson",
    verifiedBy: "",
    dateEntered: "2024-01-15",
    dateVerified: "",
    status: "Pending",
    payerName: "XYZ Consultancy"
  },
  {
    payerId: "VOL003",
    scheduleNo: "SCH-2024-003",
    period: "2024-01",
    dateReceived: "2024-01-13",
    enteredBy: "Sarah Wilson",
    verifiedBy: "Robert Brown",
    dateEntered: "2024-01-14",
    dateVerified: "2024-01-16",
    status: "Verified",
    payerName: "Individual Contributor"
  },
  {
    payerId: "EMP004",
    scheduleNo: "SCH-2024-004",
    period: "2024-01",
    dateReceived: "2024-01-12",
    enteredBy: "David Lee",
    verifiedBy: "",
    dateEntered: "2024-01-13",
    dateVerified: "",
    status: "Rejected",
    payerName: "DEF Corporation"
  },
  {
    payerId: "EMP005",
    scheduleNo: "SCH-2024-005",
    period: "2024-01",
    dateReceived: "2024-01-11",
    enteredBy: "Lisa Wang",
    verifiedBy: "Tom Davis",
    dateEntered: "2024-01-12",
    dateVerified: "2024-01-14",
    status: "Verified",
    payerName: "GHI Industries"
  }
];

export default function ManageC3() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);

  const handleView = (record: any) => {
    console.log("Viewing record:", record);
    // Implement view logic
  };

  const handleEdit = (record: any) => {
    console.log("Editing record:", record);
    // Implement edit logic
  };

  const handleDelete = (record: any) => {
    console.log("Deleting record:", record);
    // Implement delete logic with confirmation
  };

  // Filter data based on search term
  const filteredData = mockC3Data.filter(record =>
    record.payerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.payerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.scheduleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalRecords = filteredData.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredData.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Verified</Badge>;
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage C3</h1>
          <p className="text-muted-foreground">View and manage C3 contribution records</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by Payer Name, Payer ID, Schedule No, Status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* C3 Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>C3 Records</CardTitle>
              <CardDescription>
                Showing {startIndex + 1}-{Math.min(endIndex, totalRecords)} of {totalRecords} records
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payer ID</TableHead>
                  <TableHead>Schedule No.</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Date Received</TableHead>
                  <TableHead>Entered By</TableHead>
                  <TableHead>Verified By</TableHead>
                  <TableHead>Date Entered</TableHead>
                  <TableHead>Date Verified</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payer Name</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRecords.map((record, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{record.payerId}</TableCell>
                    <TableCell>{record.scheduleNo}</TableCell>
                    <TableCell>{record.period}</TableCell>
                    <TableCell>{record.dateReceived}</TableCell>
                    <TableCell>{record.enteredBy}</TableCell>
                    <TableCell>{record.verifiedBy || "-"}</TableCell>
                    <TableCell>{record.dateEntered}</TableCell>
                    <TableCell>{record.dateVerified || "-"}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>{record.payerName}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-background border shadow-md z-50" align="end">
                          <DropdownMenuItem onClick={() => handleView(record)} className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(record)} className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(record)} className="cursor-pointer text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}