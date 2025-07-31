
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, Settings, Eye, Edit, Trash2, Download } from 'lucide-react';

interface Module {
  id: string;
  name: string;
  icon: any;
  description: string;
}

interface ModulePermissionsProps {
  modules: Module[];
}

const ModulePermissions: React.FC<ModulePermissionsProps> = ({ modules }) => {
  const [moduleSettings, setModuleSettings] = useState<Record<string, any>>({
    'dashboard': {
      enabled: true,
      publicAccess: false,
      requireMFA: true,
      auditLevel: 'detailed'
    },
    'employer-management': {
      enabled: true,
      publicAccess: false,
      requireMFA: true,
      auditLevel: 'detailed'
    },
    'contribution-tracking': {
      enabled: true,
      publicAccess: false,
      requireMFA: true,
      auditLevel: 'basic'
    },
    'benefits-management': {
      enabled: true,
      publicAccess: false,
      requireMFA: false,
      auditLevel: 'detailed'
    },
    'compliance-audit': {
      enabled: true,
      publicAccess: false,
      requireMFA: true,
      auditLevel: 'comprehensive'
    },
    'reports-analytics': {
      enabled: true,
      publicAccess: false,
      requireMFA: true,
      auditLevel: 'detailed'
    }
  });

  const securityLevels = [
    { id: 'low', name: 'Low', color: 'bg-green-100 text-green-800', description: 'Basic security measures' },
    { id: 'medium', name: 'Medium', color: 'bg-yellow-100 text-yellow-800', description: 'Standard security protocols' },
    { id: 'high', name: 'High', color: 'bg-red-100 text-red-800', description: 'Enhanced security requirements' }
  ];

  const auditLevels = [
    { id: 'basic', name: 'Basic', description: 'Log access and major actions' },
    { id: 'detailed', name: 'Detailed', description: 'Log all user interactions' },
    { id: 'comprehensive', name: 'Comprehensive', description: 'Full audit trail with data changes' }
  ];

  const updateModuleSetting = (moduleId: string, setting: string, value: any) => {
    setModuleSettings(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [setting]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Module Security Configuration
          </CardTitle>
          <CardDescription>
            Configure security settings and access controls for each system module
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Changes to module security settings will affect all users. Ensure proper testing before applying changes to production.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Module Configuration */}
      <div className="space-y-6">
        {modules.map((module) => {
          const Icon = module.icon;
          const settings = moduleSettings[module.id] || {};
          
          return (
            <Card key={module.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{module.name}</CardTitle>
                      <CardDescription>{module.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={settings.enabled ? 'default' : 'secondary'}>
                    {settings.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="permissions">Permissions</TabsTrigger>
                    <TabsTrigger value="audit">Audit & Logging</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="general" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="font-medium">Module Enabled</label>
                            <p className="text-sm text-gray-600">Enable or disable this module system-wide</p>
                          </div>
                          <Switch
                            checked={settings.enabled}
                            onCheckedChange={(value) => updateModuleSetting(module.id, 'enabled', value)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="font-medium">Require Multi-Factor Authentication</label>
                            <p className="text-sm text-gray-600">Require MFA for accessing this module</p>
                          </div>
                          <Switch
                            checked={settings.requireMFA}
                            onCheckedChange={(value) => updateModuleSetting(module.id, 'requireMFA', value)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="font-medium">Public Access</label>
                            <p className="text-sm text-gray-600">Allow public access to certain features</p>
                          </div>
                          <Switch
                            checked={settings.publicAccess}
                            onCheckedChange={(value) => updateModuleSetting(module.id, 'publicAccess', value)}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="font-medium block mb-2">Security Level</label>
                          <div className="space-y-2">
                            {securityLevels.map((level) => (
                              <div key={level.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <Badge className={level.color}>{level.name}</Badge>
                                  <p className="text-sm text-gray-600 mt-1">{level.description}</p>
                                </div>
                                <input
                                  type="radio"
                                  name={`security-${module.id}`}
                                  className="h-4 w-4"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="permissions" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'view', name: 'View', icon: Eye, description: 'View module content' },
                        { id: 'edit', name: 'Edit', icon: Edit, description: 'Modify module data' },
                        { id: 'delete', name: 'Delete', icon: Trash2, description: 'Delete module records' },
                        { id: 'export', name: 'Export', icon: Download, description: 'Export module data' }
                      ].map((permission) => {
                        const Icon = permission.icon;
                        return (
                          <div key={permission.id} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">{permission.name}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{permission.description}</p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Allow all roles</span>
                                <Switch />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Require approval</span>
                                <Switch />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="audit" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div>
                        <label className="font-medium block mb-2">Audit Level</label>
                        <div className="space-y-2">
                          {auditLevels.map((level) => (
                            <div key={level.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <span className="font-medium">{level.name}</span>
                                <p className="text-sm text-gray-600">{level.description}</p>
                              </div>
                              <input
                                type="radio"
                                name={`audit-${module.id}`}
                                className="h-4 w-4"
                                defaultChecked={settings.auditLevel === level.id}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="font-medium">Log Failed Access Attempts</label>
                            <p className="text-sm text-gray-600">Track unauthorized access attempts</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="font-medium">Real-time Monitoring</label>
                            <p className="text-sm text-gray-600">Enable real-time security monitoring</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Changes */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Reset to Defaults</Button>
        <Button className="bg-green-600 hover:bg-green-700">
          Save All Changes
        </Button>
      </div>
    </div>
  );
};

export default ModulePermissions;
