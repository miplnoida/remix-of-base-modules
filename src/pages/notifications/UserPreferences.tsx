import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, Settings, Clock } from "lucide-react";
import { notificationService } from '@/services/notificationService';
import { UserPreference } from '@/types/notifications';
import { useToast } from "@/hooks/use-toast";

export default function UserPreferences() {
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await notificationService.getUserPreferences();
      setPreferences(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load user preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreference = async (userId: string, updates: Partial<UserPreference>) => {
    try {
      const updated = await notificationService.updateUserPreference(userId, updates);
      setPreferences(prev => prev.map(p => p.userId === userId ? updated : p));
      setSelectedUser(updated);
      toast({
        title: "Success",
        description: "User preferences updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user preferences",
        variant: "destructive",
      });
    }
  };

  const filteredPreferences = preferences.filter(p =>
    p.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Preferences</h1>
          <p className="text-muted-foreground">Manage notification preferences for all users</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Default Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>Select a user to manage their preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Channels</TableHead>
                      <TableHead>Frequency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPreferences.map((user) => (
                      <TableRow 
                        key={user.userId}
                        className={`cursor-pointer ${selectedUser?.userId === user.userId ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedUser(user)}
                      >
                        <TableCell className="font-medium">{user.userName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.emailNotifications && <Badge variant="outline">Email</Badge>}
                            {user.smsNotifications && <Badge variant="outline">SMS</Badge>}
                            {user.pushNotifications && <Badge variant="outline">Push</Badge>}
                            {user.inAppNotifications && <Badge variant="outline">In-App</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{user.frequency}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {selectedUser && (
              <Card>
                <CardHeader>
                  <CardTitle>Edit Preferences</CardTitle>
                  <CardDescription>{selectedUser.userName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Notification Channels</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email">Email</Label>
                        <Switch
                          id="email"
                          checked={selectedUser.emailNotifications}
                          onCheckedChange={(checked) => 
                            handleUpdatePreference(selectedUser.userId, { emailNotifications: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sms">SMS</Label>
                        <Switch
                          id="sms"
                          checked={selectedUser.smsNotifications}
                          onCheckedChange={(checked) => 
                            handleUpdatePreference(selectedUser.userId, { smsNotifications: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="push">Push</Label>
                        <Switch
                          id="push"
                          checked={selectedUser.pushNotifications}
                          onCheckedChange={(checked) => 
                            handleUpdatePreference(selectedUser.userId, { pushNotifications: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="inapp">In-App</Label>
                        <Switch
                          id="inapp"
                          checked={selectedUser.inAppNotifications}
                          onCheckedChange={(checked) => 
                            handleUpdatePreference(selectedUser.userId, { inAppNotifications: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select
                      value={selectedUser.frequency}
                      onValueChange={(value: "Immediate" | "Hourly" | "Daily" | "Weekly") => 
                        handleUpdatePreference(selectedUser.userId, { frequency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Immediate">Immediate</SelectItem>
                        <SelectItem value="Hourly">Hourly</SelectItem>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select
                      value={selectedUser.priority}
                      onValueChange={(value: "All" | "High Only" | "Critical Only") => 
                        handleUpdatePreference(selectedUser.userId, { priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Notifications</SelectItem>
                        <SelectItem value="High Only">High Priority Only</SelectItem>
                        <SelectItem value="Critical Only">Critical Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedUser.quietHoursStart && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="quietStart">Quiet Hours Start</Label>
                        <Input
                          id="quietStart"
                          type="time"
                          value={selectedUser.quietHoursStart}
                          onChange={(e) => 
                            handleUpdatePreference(selectedUser.userId, { quietHoursStart: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="quietEnd">Quiet Hours End</Label>
                        <Input
                          id="quietEnd"
                          type="time"
                          value={selectedUser.quietHoursEnd}
                          onChange={(e) => 
                            handleUpdatePreference(selectedUser.userId, { quietHoursEnd: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Default Notification Settings
              </CardTitle>
              <CardDescription>
                Configure default preferences for new users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Default Channels</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="default-email">Email</Label>
                      <Switch id="default-email" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="default-sms">SMS</Label>
                      <Switch id="default-sms" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="default-push">Push</Label>
                      <Switch id="default-push" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="default-inapp">In-App</Label>
                      <Switch id="default-inapp" defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Default Frequency</Label>
                    <Select defaultValue="Immediate">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Immediate">Immediate</SelectItem>
                        <SelectItem value="Hourly">Hourly</SelectItem>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Default Priority</Label>
                    <Select defaultValue="All">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Notifications</SelectItem>
                        <SelectItem value="High Only">High Priority Only</SelectItem>
                        <SelectItem value="Critical Only">Critical Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Default Quiet Start</Label>
                      <Input type="time" defaultValue="22:00" />
                    </div>
                    <div>
                      <Label>Default Quiet End</Label>
                      <Input type="time" defaultValue="08:00" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button>Save Default Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}