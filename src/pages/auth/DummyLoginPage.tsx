import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LogIn, Users, Shield, Building } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const DummyLoginPage = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState('');
  const [password, setPassword] = useState('password123');

  const dummyUsers = [
    // Main System Users
    {
      email: 'admin@secureserve.gov',
      name: 'System Administrator',
      role: 'Admin',
      department: 'Administration',
      permissions: 'All System Access'
    },
    {
      email: 'accounts@secureserve.gov',
      name: 'Accounts Manager',
      role: 'Accounts Manager',
      department: 'Accounts Department',
      permissions: 'Financial & Cashier Operations'
    },
    {
      email: 'cashier@secureserve.gov',
      name: 'Cashier Officer',
      role: 'Cashier',
      department: 'Accounts Department',
      permissions: 'Payment Collection & Reports'
    },
    {
      email: 'supervisor@secureserve.gov',
      name: 'Cashier Supervisor',
      role: 'Cashier Supervisor',
      department: 'Accounts Department',
      permissions: 'Batch Management & Approvals'
    },
    {
      email: 'hr@secureserve.gov',
      name: 'HR Manager',
      role: 'HR Manager',
      department: 'Human Resources',
      permissions: 'Employee Management'
    },
    {
      email: 'compliance@secureserve.gov',
      name: 'Compliance Officer',
      role: 'Compliance Officer',
      department: 'Compliance',
      permissions: 'Compliance & Inspections'
    },
    {
      email: 'benefits@secureserve.gov',
      name: 'Benefits Manager',
      role: 'Benefits Manager',
      department: 'Benefits',
      permissions: 'Claims & Benefits Processing'
    },
    {
      email: 'legal@secureserve.gov',
      name: 'Legal Officer',
      role: 'Legal Officer',
      department: 'Legal',
      permissions: 'Legal Proceedings & Cases'
    },
    // NewBenefit System Users (for reference)
    {
      email: 'contributor1@example.com',
      name: 'John Contributor (NewBenefit)',
      role: 'Contributor',
      department: 'NewBenefit System',
      permissions: 'Apply for Benefits, View Claims'
    },
    {
      email: 'contributor2@example.com',
      name: 'Jane Smith (NewBenefit)',
      role: 'Contributor',
      department: 'NewBenefit System',
      permissions: 'Apply for Benefits, View Claims'
    },
    {
      email: 'claims.officer@ssb.gov.kn',
      name: 'Mary Officer (NewBenefit)',
      role: 'Claims Officer',
      department: 'NewBenefit System',
      permissions: 'Process Claims, Make Decisions'
    },
    {
      email: 'supervisor@ssb.gov.kn',
      name: 'Robert Supervisor (NewBenefit)',
      role: 'Supervisor',
      department: 'NewBenefit System',
      permissions: 'Approve Claims, Team Management'
    },
    {
      email: 'payments@ssb.gov.kn',
      name: 'Linda Payments (NewBenefit)',
      role: 'Payments Officer',
      department: 'NewBenefit System',
      permissions: 'Process Payments, Manage Overpayments'
    },
    {
      email: 'medical@ssb.gov.kn',
      name: 'Dr. James Medical (NewBenefit)',
      role: 'Medical Coordinator',
      department: 'NewBenefit System',
      permissions: 'Medical Reviews, Board Scheduling'
    },
    {
      email: 'employer@ssb.gov.kn',
      name: 'Sarah Employer (NewBenefit)',
      role: 'Employer Liaison',
      department: 'NewBenefit System',
      permissions: 'Verify Employment, Compliance'
    },
    {
      email: 'newbenefit.admin@ssb.gov.kn',
      name: 'Michael Admin (NewBenefit)',
      role: 'NewBenefit Admin',
      department: 'NewBenefit System',
      permissions: 'All NewBenefit Access'
    },
    {
      email: 'auditor@ssb.gov.kn',
      name: 'Patricia Auditor (NewBenefit)',
      role: 'Auditor',
      department: 'NewBenefit System',
      permissions: 'Audit Reports, System Review'
    }
  ];

  const handleQuickLogin = async (email: string) => {
    const success = await login(email, password);
    if (success) {
      toast({
        title: "Login Successful",
        description: `Welcome back! Logged in as ${dummyUsers.find(u => u.email === email)?.name}`,
      });
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManualLogin = async () => {
    if (!selectedUser) {
      toast({
        title: "Please Select User",
        description: "Please select a user to login with.",
        variant: "destructive",
      });
      return;
    }

    const success = await login(selectedUser, password);
    if (success) {
      toast({
        title: "Login Successful",
        description: `Welcome back! Logged in as ${dummyUsers.find(u => u.email === selectedUser)?.name}`,
      });
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/5 via-background to-primary/5 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
             <img 
              src="/images/ssb-logo.png" 
              alt="St. Christopher & Nevis Social Security Board" 
              className="h-20 w-20 object-contain"
            />
          </div>
          <h1 className="text-[26px] font-semibold text-foreground mb-1">St. Christopher & Nevis Social Security Board</h1>
          <p className="text-muted-foreground text-sm">Enterprise Administration Portal</p>
          <Badge variant="outline" className="mt-2 border-primary/30 text-primary">Demo Environment</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Login Section */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Users className="h-5 w-5 text-primary" />
                Quick Login - Demo Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dummyUsers.map((user) => (
                  <div key={user.email} className="p-3 border rounded-lg hover:bg-muted/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">{user.name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {user.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{user.email}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Building className="h-3 w-3" />
                          {user.department}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Shield className="h-3 w-3" />
                          {user.permissions}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleQuickLogin(user.email)}
                        className="ml-3"
                      >
                        <LogIn className="h-4 w-4 mr-1" />
                        Login
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Manual Login Section */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <LogIn className="h-5 w-5 text-primary" />
                Manual Login
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user to login as..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dummyUsers.map((user) => (
                      <SelectItem key={user.email} value={user.email}>
                        {user.name} - {user.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>

              <Button onClick={handleManualLogin} className="w-full">
                <LogIn className="h-4 w-4 mr-2" />
                Login to System
              </Button>

              <Separator />

              <div className="bg-primary/5 border border-primary/15 p-4 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Demo Credentials</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Password for all users:</strong> password123
                </p>
                <p className="text-xs text-muted-foreground">
                  This is a demonstration environment. All login credentials are for testing purposes only.
                </p>
              </div>

              <div className="bg-secondary/5 border border-secondary/15 p-4 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Cashier Module Access</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  To access the <strong>Cashier & Payments</strong> module, login as:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Accounts Manager:</strong> Full cashier system access</li>
                  <li>• <strong>Cashier Officer:</strong> Payment collection & reports</li>
                  <li>• <strong>Cashier Supervisor:</strong> Batch management & approvals</li>
                  <li>• <strong>System Administrator:</strong> Complete system access</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} St. Christopher & Nevis Social Security Board
          </p>
        </div>
      </div>
    </div>
  );
};

export default DummyLoginPage;