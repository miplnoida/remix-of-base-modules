
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, GraduationCap, Calendar, FileText, Search, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EducationalBenefits = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Educational benefit claim submitted");
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
                <span className="text-gray-900 font-medium">Educational Benefits</span>
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
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Educational Benefits</h1>
          </div>
          <p className="text-gray-600">
            Manage educational assistance and scholarship programs
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  New Educational Benefit Application
                </CardTitle>
                <CardDescription>
                  Apply for educational assistance or scholarship program
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="border-l-4 border-blue-500 bg-blue-50 p-4 mb-6">
                    <h3 className="font-semibold text-blue-900 mb-2">Applicant Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="applicantType">Applicant Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select applicant type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="dependent">Dependent/Child</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">Employee ID (if applicable)</Label>
                      <Input
                        id="employeeId"
                        placeholder="Enter employee ID"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="studentName">Student Name</Label>
                      <Input
                        id="studentName"
                        placeholder="Enter student name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentId">Student ID/Registration</Label>
                      <Input
                        id="studentId"
                        placeholder="Enter student ID"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="educationLevel">Education Level</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select education level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary School</SelectItem>
                        <SelectItem value="secondary">Secondary School</SelectItem>
                        <SelectItem value="vocational">Vocational Training</SelectItem>
                        <SelectItem value="undergraduate">Undergraduate</SelectItem>
                        <SelectItem value="graduate">Graduate/Masters</SelectItem>
                        <SelectItem value="doctoral">Doctoral/PhD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="institution">Educational Institution</Label>
                      <Input
                        id="institution"
                        placeholder="Enter school/university name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="program">Program/Course of Study</Label>
                      <Input
                        id="program"
                        placeholder="Enter program name"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="academicYear">Academic Year</Label>
                      <Input
                        id="academicYear"
                        placeholder="e.g., 2024-2025"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="semester">Semester/Term</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fall">Fall Semester</SelectItem>
                          <SelectItem value="spring">Spring Semester</SelectItem>
                          <SelectItem value="summer">Summer Term</SelectItem>
                          <SelectItem value="full-year">Full Academic Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="benefitType">Benefit Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select benefit type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tuition">Tuition Assistance</SelectItem>
                        <SelectItem value="scholarship">Scholarship</SelectItem>
                        <SelectItem value="books">Book Allowance</SelectItem>
                        <SelectItem value="supplies">School Supplies</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                        <SelectItem value="full-support">Full Educational Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="requestedAmount">Requested Amount</Label>
                      <Input
                        id="requestedAmount"
                        type="number"
                        placeholder="Enter amount"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gpa">GPA/Academic Performance</Label>
                      <Input
                        id="gpa"
                        placeholder="e.g., 3.5/4.0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="justification">Justification/Purpose</Label>
                    <Textarea
                      id="justification"
                      placeholder="Explain why this educational benefit is needed"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="futureGoals">Future Goals/Career Plans</Label>
                    <Textarea
                      id="futureGoals"
                      placeholder="Describe how this education will benefit your career"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline">
                      Save Draft
                    </Button>
                    <Button type="submit">
                      Submit Application
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>
                  Latest educational benefit applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search applications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { id: "EDU-001", name: "Alice Johnson", amount: "$5,000", status: "Approved" },
                    { id: "EDU-002", name: "Michael Brown", amount: "$3,500", status: "Pending" },
                    { id: "EDU-003", name: "Emma Davis", amount: "$4,200", status: "Under Review" },
                  ].map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{app.name}</p>
                        <p className="text-xs text-gray-500">{app.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{app.amount}</p>
                        <p className={`text-xs ${
                          app.status === 'Approved' ? 'text-green-600' :
                          app.status === 'Pending' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`}>
                          {app.status}
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
                  <BookOpen className="h-5 w-5" />
                  Program Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Scholarships</span>
                    <span className="font-semibold">45</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Annual Budget</span>
                    <span className="font-semibold">$250,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">This Semester</span>
                    <span className="font-semibold text-blue-600">12 New</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="font-semibold text-green-600">92%</span>
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

export default EducationalBenefits;
