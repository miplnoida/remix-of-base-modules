
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Skull, Calendar, FileText, Search, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DeathBenefits = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Death benefit claim submitted");
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
                <span className="text-gray-900 font-medium">Death Benefits</span>
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
            <Heart className="h-8 w-8 text-gray-600" />
            <h1 className="text-3xl font-bold text-gray-900">Death Benefits</h1>
          </div>
          <p className="text-gray-600">
            Process death benefit claims for deceased insured persons
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  New Death Benefit Claim
                </CardTitle>
                <CardDescription>
                  Submit a death benefit claim for an insured person
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="border-l-4 border-blue-500 bg-blue-50 p-4 mb-6">
                    <h3 className="font-semibold text-blue-900 mb-2">Deceased Person Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deceasedId">Deceased Employee ID</Label>
                      <Input
                        id="deceasedId"
                        placeholder="Enter employee ID"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deceasedName">Full Name</Label>
                      <Input
                        id="deceasedName"
                        placeholder="Enter full name"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfDeath">Date of Death</Label>
                      <Input
                        id="dateOfDeath"
                        type="date"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="placeOfDeath">Place of Death</Label>
                      <Input
                        id="placeOfDeath"
                        placeholder="Enter place of death"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="causeOfDeath">Cause of Death</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cause of death" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="natural">Natural Causes</SelectItem>
                        <SelectItem value="accident">Accident</SelectItem>
                        <SelectItem value="work-related">Work-Related</SelectItem>
                        <SelectItem value="illness">Illness</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border-l-4 border-green-500 bg-green-50 p-4 mb-6">
                    <h3 className="font-semibold text-green-900 mb-2">Beneficiary Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="beneficiaryName">Primary Beneficiary Name</Label>
                      <Input
                        id="beneficiaryName"
                        placeholder="Enter beneficiary name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="relationship">Relationship to Deceased</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="sibling">Sibling</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="beneficiaryId">Beneficiary ID/Passport</Label>
                      <Input
                        id="beneficiaryId"
                        placeholder="Enter ID or passport number"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="beneficiaryPhone">Contact Phone</Label>
                      <Input
                        id="beneficiaryPhone"
                        placeholder="Enter phone number"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="beneficiaryAddress">Beneficiary Address</Label>
                    <Textarea
                      id="beneficiaryAddress"
                      placeholder="Enter complete address"
                      rows={2}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="claimAmount">Claim Amount</Label>
                    <Input
                      id="claimAmount"
                      type="number"
                      placeholder="Enter benefit amount"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAccount">Beneficiary Bank Account</Label>
                    <Input
                      id="bankAccount"
                      placeholder="Enter bank account number"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additionalNotes">Additional Notes</Label>
                    <Textarea
                      id="additionalNotes"
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
                  Latest death benefit claims
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
                    { id: "DB-001", name: "Mary Johnson", amount: "$50,000", status: "Approved" },
                    { id: "DB-002", name: "William Smith", amount: "$75,000", status: "Processing" },
                    { id: "DB-003", name: "Patricia Davis", amount: "$60,000", status: "Under Review" },
                  ].map((claim) => (
                    <div key={claim.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{claim.name}</p>
                        <p className="text-xs text-gray-500">{claim.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{claim.amount}</p>
                        <p className={`text-xs ${
                          claim.status === 'Approved' ? 'text-green-600' :
                          claim.status === 'Processing' ? 'text-blue-600' :
                          'text-yellow-600'
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
                  Monthly Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Claims This Month</span>
                    <span className="font-semibold">3</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Payout</span>
                    <span className="font-semibold">$185,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Approved</span>
                    <span className="font-semibold text-green-600">1</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="font-semibold text-yellow-600">2</span>
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

export default DeathBenefits;
