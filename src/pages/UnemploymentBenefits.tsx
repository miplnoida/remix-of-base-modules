
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, BriefcaseIcon, Calendar, FileText, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UnemploymentBenefits = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Unemployment benefit claim submitted");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
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
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Benefits Management</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Unemployment Benefits</span>
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
            <BriefcaseIcon className="h-8 w-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">Unemployment Benefits</h1>
          </div>
          <p className="text-gray-600">
            Process unemployment benefit claims for eligible insured persons
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  New Unemployment Benefit Claim
                </CardTitle>
                <CardDescription>
                  Submit a new unemployment benefit application
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
                      <Label htmlFor="terminationDate">Employment Termination Date</Label>
                      <Input
                        id="terminationDate"
                        type="date"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastWorkingDay">Last Working Day</Label>
                      <Input
                        id="lastWorkingDay"
                        type="date"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="terminationReason">Reason for Termination</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select termination reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="layoff">Layoff</SelectItem>
                        <SelectItem value="company-closure">Company Closure</SelectItem>
                        <SelectItem value="contract-end">Contract End</SelectItem>
                        <SelectItem value="redundancy">Redundancy</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lastSalary">Last Monthly Salary</Label>
                      <Input
                        id="lastSalary"
                        type="number"
                        placeholder="Enter amount"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contributionPeriod">Contribution Period (months)</Label>
                      <Input
                        id="contributionPeriod"
                        type="number"
                        placeholder="Enter number of months"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="benefitPeriod">Requested Benefit Period</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select benefit period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3-months">3 Months</SelectItem>
                        <SelectItem value="6-months">6 Months</SelectItem>
                        <SelectItem value="9-months">9 Months</SelectItem>
                        <SelectItem value="12-months">12 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAccount">Bank Account Number</Label>
                    <Input
                      id="bankAccount"
                      placeholder="Enter bank account number"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additionalInfo">Additional Information</Label>
                    <Textarea
                      id="additionalInfo"
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

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Claims</CardTitle>
                <CardDescription>
                  Latest unemployment benefit claims
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
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
                    { id: "UB-001", name: "John Smith", amount: "$1,200/mo", status: "Active" },
                    { id: "UB-002", name: "David Wilson", amount: "$980/mo", status: "Pending" },
                    { id: "UB-003", name: "Mike Brown", amount: "$1,100/mo", status: "Under Review" },
                  ].map((claim) => (
                    <div key={claim.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{claim.name}</p>
                        <p className="text-xs text-gray-500">{claim.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{claim.amount}</p>
                        <p className={`text-xs ${
                          claim.status === 'Active' ? 'text-green-600' :
                          claim.status === 'Pending' ? 'text-yellow-600' :
                          'text-blue-600'
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
                    <span className="text-sm text-gray-600">Active Claims</span>
                    <span className="font-semibold">23</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Monthly Payout</span>
                    <span className="font-semibold">$25,400</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">New This Month</span>
                    <span className="font-semibold text-blue-600">5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending Review</span>
                    <span className="font-semibold text-yellow-600">3</span>
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

export default UnemploymentBenefits;
