
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Baby, Calendar, FileText, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MaternityBenefits = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Maternity benefit claim submitted");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-border" />
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Benefits Management</span>
                <span>/</span>
                <span className="text-foreground font-medium">Maternity Benefits</span>
              </nav>
            </div>
            <Button onClick={() => navigate("/")} variant="outline" size="sm">
              Main Menu
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Baby className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Maternity Benefits</h1>
          </div>
          <p className="text-muted-foreground">
            Manage maternity benefit claims and applications for insured persons
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Claim Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  New Maternity Benefit Claim
                </CardTitle>
                <CardDescription>
                  Submit a new maternity benefit claim application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">Employee ID</Label>
                      <Input
                        id="employeeId"
                        placeholder="Enter employee ID"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        placeholder="Enter full name"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expectedDate">Expected Delivery Date</Label>
                      <Input
                        id="expectedDate"
                        type="date"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="actualDate">Actual Delivery Date</Label>
                      <Input
                        id="actualDate"
                        type="date"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="leaveStart">Maternity Leave Start</Label>
                      <Input
                        id="leaveStart"
                        type="date"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leaveEnd">Maternity Leave End</Label>
                      <Input
                        id="leaveEnd"
                        type="date"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="claimType">Claim Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select claim type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="maternity-allowance">Maternity Allowance</SelectItem>
                        <SelectItem value="delivery-expenses">Delivery Expenses</SelectItem>
                        <SelectItem value="prenatal-care">Prenatal Care</SelectItem>
                        <SelectItem value="postnatal-care">Postnatal Care</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medicalFacility">Medical Facility</Label>
                    <Input
                      id="medicalFacility"
                      placeholder="Name of hospital/clinic"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="claimAmount">Claim Amount</Label>
                    <Input
                      id="claimAmount"
                      type="number"
                      placeholder="Enter amount"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Enter any additional information"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline">
                      Save Draft
                    </Button>
                    <Button type="submit">
                      Submit Claim
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Recent Claims */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Claims</CardTitle>
                <CardDescription>
                  Latest maternity benefit claims
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search claims..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { id: "MAT-001", name: "Sarah Johnson", amount: "$2,500", status: "Approved" },
                    { id: "MAT-002", name: "Maria Garcia", amount: "$1,800", status: "Pending" },
                    { id: "MAT-003", name: "Lisa Chen", amount: "$2,200", status: "Under Review" },
                  ].map((claim) => (
                    <div key={claim.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{claim.name}</p>
                        <p className="text-xs text-muted-foreground">{claim.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{claim.amount}</p>
                        <p className={`text-xs ${
                          claim.status === 'Approved' ? 'text-success' :
                          claim.status === 'Pending' ? 'text-warning' :
                          'text-info'
                        }`}>
                          {claim.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">This Month</span>
                    <span className="font-semibold">12 Claims</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Amount</span>
                    <span className="font-semibold">$28,500</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Approved</span>
                    <span className="font-semibold text-success">8</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <span className="font-semibold text-warning">4</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaternityBenefits;
