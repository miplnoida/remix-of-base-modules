
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Wrench, Calendar, FileText, Search, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WorkInjuryBenefits = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Work injury benefit claim submitted");
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
                <span className="text-gray-900 font-medium">Work Injury Benefits</span>
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
            <Wrench className="h-8 w-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900">Work Injury Benefits</h1>
          </div>
          <p className="text-gray-600">
            Process work-related injury compensation claims
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  New Work Injury Claim
                </CardTitle>
                <CardDescription>
                  Report a work-related injury and submit compensation claim
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
                      <Label htmlFor="incidentDate">Date of Incident</Label>
                      <Input
                        id="incidentDate"
                        type="date"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incidentTime">Time of Incident</Label>
                      <Input
                        id="incidentTime"
                        type="time"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workplace">Workplace Location</Label>
                    <Input
                      id="workplace"
                      placeholder="Enter workplace address"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="injuryType">Type of Injury</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select injury type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fracture">Fracture</SelectItem>
                        <SelectItem value="sprain">Sprain/Strain</SelectItem>
                        <SelectItem value="cut">Cut/Laceration</SelectItem>
                        <SelectItem value="burn">Burn</SelectItem>
                        <SelectItem value="back-injury">Back Injury</SelectItem>
                        <SelectItem value="head-injury">Head Injury</SelectItem>
                        <SelectItem value="eye-injury">Eye Injury</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bodyPart">Injured Body Part</Label>
                    <Input
                      id="bodyPart"
                      placeholder="Specify injured body part"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="severity">Injury Severity</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">Minor</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="serious">Serious</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="incidentDescription">Incident Description</Label>
                    <Textarea
                      id="incidentDescription"
                      placeholder="Describe how the injury occurred"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="witnesses">Witnesses</Label>
                    <Textarea
                      id="witnesses"
                      placeholder="List any witnesses present"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medicalTreatment">Medical Treatment Received</Label>
                    <Textarea
                      id="medicalTreatment"
                      placeholder="Describe medical treatment received"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="medicalFacility">Medical Facility</Label>
                      <Input
                        id="medicalFacility"
                        placeholder="Name of hospital/clinic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="medicalCost">Medical Expenses</Label>
                      <Input
                        id="medicalCost"
                        type="number"
                        placeholder="Enter amount"
                        step="0.01"
                      />
                    </div>
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
                  Latest work injury claims
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
                    { id: "WI-001", name: "Robert Taylor", severity: "Moderate", status: "Approved" },
                    { id: "WI-002", name: "Jennifer Davis", severity: "Minor", status: "Pending" },
                    { id: "WI-003", name: "Carlos Rodriguez", severity: "Serious", status: "Under Review" },
                  ].map((claim) => (
                    <div key={claim.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{claim.name}</p>
                        <p className="text-xs text-gray-500">{claim.id}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium text-sm ${
                          claim.severity === 'Serious' ? 'text-red-600' :
                          claim.severity === 'Moderate' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {claim.severity}
                        </p>
                        <p className={`text-xs ${
                          claim.status === 'Approved' ? 'text-green-600' :
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
                  <AlertTriangle className="h-5 w-5" />
                  Safety Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">This Month</span>
                    <span className="font-semibold">7 Incidents</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Serious Injuries</span>
                    <span className="font-semibold text-red-600">2</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Minor Injuries</span>
                    <span className="font-semibold text-yellow-600">5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Claims</span>
                    <span className="font-semibold">$15,800</span>
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

export default WorkInjuryBenefits;
