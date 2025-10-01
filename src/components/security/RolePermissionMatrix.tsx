
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Eye, Edit, Trash2, Download, Plus, Users, UserPlus, Heart, FileText, BarChart, CheckCircle, Upload } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  users: number;
  color: string;
  permissions: number;
}

interface Module {
  id: string;
  name: string;
  icon: any;
  description: string;
  subModules?: {
    id: string;
    name: string;
    description: string;
  }[];
}

interface RolePermissionMatrixProps {
  selectedRole: string;
  roles: Role[];
  modules: Module[];
}

const RolePermissionMatrix: React.FC<RolePermissionMatrixProps> = ({
  selectedRole,
  roles,
  modules
}) => {
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({
    'system-admin': {
      'employer-management-registration-view': true,
      'employer-management-registration-add': true,
      'employer-management-registration-edit': true,
      'employer-management-registration-delete': true,
      'employer-management-registration-approval': true,
      'employer-management-registration-export': true,
      'employer-management-registration-report': true,
      'employer-management-contribution-view': true,
      'employer-management-contribution-add': true,
      'employer-management-contribution-edit': true,
      'employer-management-contribution-delete': true,
      'employer-management-contribution-import': true,
      'employer-management-contribution-export': true,
      'employer-management-contribution-report': true,
      'insured-persons-registration-view': true,
      'insured-persons-registration-edit': true,
      'insured-persons-registration-delete': true,
      'insured-persons-registration-export': true,
      'insured-persons-management-view': true,
      'insured-persons-management-edit': true,
      'insured-persons-management-delete': true,
      'insured-persons-management-export': true,
      'benefits-claims-view': true,
      'benefits-claims-edit': true,
      'benefits-claims-delete': true,
      'benefits-claims-export': true,
      'benefits-processing-view': true,
      'benefits-processing-edit': true,
      'benefits-processing-delete': true,
      'benefits-processing-export': true,
    },
    'hr-manager': {
      'employer-management-registration-view': true,
      'employer-management-registration-add': true,
      'employer-management-registration-edit': true,
      'employer-management-registration-delete': false,
      'employer-management-registration-approval': false,
      'employer-management-registration-export': true,
      'employer-management-registration-report': true,
      'employer-management-contribution-view': true,
      'employer-management-contribution-add': true,
      'employer-management-contribution-edit': true,
      'employer-management-contribution-delete': false,
      'employer-management-contribution-import': true,
      'employer-management-contribution-export': true,
      'employer-management-contribution-report': true,
      'insured-persons-registration-view': true,
      'insured-persons-registration-edit': true,
      'insured-persons-registration-delete': false,
      'insured-persons-registration-export': true,
      'insured-persons-management-view': true,
      'insured-persons-management-edit': true,
      'insured-persons-management-delete': false,
      'insured-persons-management-export': true,
      'benefits-claims-view': true,
      'benefits-claims-edit': false,
      'benefits-claims-delete': false,
      'benefits-claims-export': true,
      'benefits-processing-view': true,
      'benefits-processing-edit': false,
      'benefits-processing-delete': false,
      'benefits-processing-export': true,
    },
    'compliance-officer': {
      'employer-management-registration-view': true,
      'employer-management-registration-add': false,
      'employer-management-registration-edit': false,
      'employer-management-registration-delete': false,
      'employer-management-registration-approval': false,
      'employer-management-registration-export': true,
      'employer-management-registration-report': true,
      'employer-management-contribution-view': true,
      'employer-management-contribution-add': false,
      'employer-management-contribution-edit': false,
      'employer-management-contribution-delete': false,
      'employer-management-contribution-import': false,
      'employer-management-contribution-export': true,
      'employer-management-contribution-report': true,
      'insured-persons-registration-view': true,
      'insured-persons-registration-edit': false,
      'insured-persons-registration-delete': false,
      'insured-persons-registration-export': true,
      'insured-persons-management-view': true,
      'insured-persons-management-edit': false,
      'insured-persons-management-delete': false,
      'insured-persons-management-export': true,
      'benefits-claims-view': true,
      'benefits-claims-edit': false,
      'benefits-claims-delete': false,
      'benefits-claims-export': true,
      'benefits-processing-view': true,
      'benefits-processing-edit': false,
      'benefits-processing-delete': false,
      'benefits-processing-export': true,
    }
  });

  // Updated modules structure with new permission sets
  const modulesWithSubModules = [
    {
      id: 'employer-management',
      name: 'Employer Management',
      icon: Users,
      description: 'Manage employer registration and contributions',
      subModules: [
        { 
          id: 'registration', 
          name: 'Employer', 
          description: 'Handle employer registrations and approvals',
          features: [
            { id: 'view', name: 'View', icon: Eye, color: 'text-blue-600' },
            { id: 'add', name: 'Add', icon: Plus, color: 'text-green-600' },
            { id: 'edit', name: 'Edit', icon: Edit, color: 'text-orange-600' },
            { id: 'delete', name: 'Delete', icon: Trash2, color: 'text-red-600' },
            { id: 'approval', name: 'Approval', icon: CheckCircle, color: 'text-purple-600' },
            { id: 'export', name: 'Export', icon: Download, color: 'text-indigo-600' },
            { id: 'report', name: 'Report', icon: FileText, color: 'text-orange-600' }
          ]
        },
        { 
          id: 'contribution', 
          name: 'Contribution', 
          description: 'Manage employer contributions and bulk operations',
          features: [
            { id: 'view', name: 'View', icon: Eye, color: 'text-blue-600' },
            { id: 'add', name: 'Add', icon: Plus, color: 'text-green-600' },
            { id: 'edit', name: 'Edit', icon: Edit, color: 'text-orange-600' },
            { id: 'delete', name: 'Delete', icon: Trash2, color: 'text-red-600' },
            { id: 'import', name: 'Import Bulk', icon: Upload, color: 'text-cyan-600' },
            { id: 'export', name: 'Export', icon: Download, color: 'text-indigo-600' },
            { id: 'report', name: 'Report', icon: FileText, color: 'text-orange-600' }
          ]
        }
      ]
    },
    {
      id: 'insured-persons',
      name: 'Insured Persons',
      icon: UserPlus,
      description: 'Manage insured person registration and data',
      subModules: [
        { 
          id: 'registration', 
          name: 'Person Registration', 
          description: 'Register new insured persons',
          features: [
            { id: 'view', name: 'View', icon: Eye, color: 'text-blue-600' },
            { id: 'edit', name: 'Edit', icon: Edit, color: 'text-green-600' },
            { id: 'delete', name: 'Delete', icon: Trash2, color: 'text-red-600' },
            { id: 'export', name: 'Export', icon: Download, color: 'text-purple-600' }
          ]
        },
        { 
          id: 'management', 
          name: 'Person Management', 
          description: 'Manage existing insured person records',
          features: [
            { id: 'view', name: 'View', icon: Eye, color: 'text-blue-600' },
            { id: 'edit', name: 'Edit', icon: Edit, color: 'text-green-600' },
            { id: 'delete', name: 'Delete', icon: Trash2, color: 'text-red-600' },
            { id: 'export', name: 'Export', icon: Download, color: 'text-purple-600' }
          ]
        }
      ]
    },
    {
      id: 'benefits',
      name: 'Benefits',
      icon: Heart,
      description: 'Manage benefits claims and processing',
      subModules: [
        { 
          id: 'claims', 
          name: 'Claims Management', 
          description: 'Process and manage benefit claims',
          features: [
            { id: 'view', name: 'View', icon: Eye, color: 'text-blue-600' },
            { id: 'edit', name: 'Edit', icon: Edit, color: 'text-green-600' },
            { id: 'delete', name: 'Delete', icon: Trash2, color: 'text-red-600' },
            { id: 'export', name: 'Export', icon: Download, color: 'text-purple-600' }
          ]
        },
        { 
          id: 'processing', 
          name: 'Benefits Processing', 
          description: 'Handle benefit calculations and payments',
          features: [
            { id: 'view', name: 'View', icon: Eye, color: 'text-blue-600' },
            { id: 'edit', name: 'Edit', icon: Edit, color: 'text-green-600' },
            { id: 'delete', name: 'Delete', icon: Trash2, color: 'text-red-600' },
            { id: 'export', name: 'Export', icon: Download, color: 'text-purple-600' }
          ]
        }
      ]
    },
    {
      id: 'reports-analytics',
      name: 'Reports & Analytics',
      icon: BarChart,
      description: 'Generate reports and analytics',
      subModules: [
        { 
          id: 'reports', 
          name: 'Standard Reports', 
          description: 'Generate standard system reports',
          features: [
            { id: 'view', name: 'View', icon: Eye, color: 'text-blue-600' },
            { id: 'edit', name: 'Edit', icon: Edit, color: 'text-green-600' },
            { id: 'delete', name: 'Delete', icon: Trash2, color: 'text-red-600' },
            { id: 'export', name: 'Export', icon: Download, color: 'text-purple-600' }
          ]
        },
        { 
          id: 'analytics', 
          name: 'Advanced Analytics', 
          description: 'Access advanced analytics and insights',
          features: [
            { id: 'view', name: 'View', icon: Eye, color: 'text-blue-600' },
            { id: 'edit', name: 'Edit', icon: Edit, color: 'text-green-600' },
            { id: 'delete', name: 'Delete', icon: Trash2, color: 'text-red-600' },
            { id: 'export', name: 'Export', icon: Download, color: 'text-purple-600' }
          ]
        }
      ]
    }
  ];

  const selectedRoleData = roles.find(role => role.id === selectedRole);

  const togglePermission = (moduleId: string, subModuleId: string, featureId: string) => {
    const key = `${moduleId}-${subModuleId}-${featureId}`;
    setPermissions(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [key]: !prev[selectedRole]?.[key]
      }
    }));
  };

  const getPermissionValue = (moduleId: string, subModuleId: string, featureId: string): boolean => {
    const key = `${moduleId}-${subModuleId}-${featureId}`;
    return permissions[selectedRole]?.[key] || false;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              Permission Matrix
              {selectedRoleData && (
                <Badge className={selectedRoleData.color}>
                  {selectedRoleData.name}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Configure granular permissions for the selected role
            </CardDescription>
          </div>
          <Button size="sm" className="bg-green-600 hover:bg-green-700">
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Collapsible Permission Matrix */}
          <Accordion type="multiple" className="space-y-4">
            {modulesWithSubModules.map((module) => {
              const Icon = module.icon;
              return (
                <AccordionItem key={module.id} value={module.id} className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <div className="text-left">
                        <h3 className="font-medium text-gray-900">{module.name}</h3>
                        <p className="text-sm text-gray-600">{module.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      {module.subModules?.map((subModule) => (
                        <div key={subModule.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="mb-3">
                            <h4 className="font-medium text-gray-900">{subModule.name}</h4>
                            <p className="text-sm text-gray-600">{subModule.description}</p>
                          </div>
                          <div className="grid grid-cols-4 gap-3">
                            {(subModule as any).features?.map((feature: any) => {
                              const FeatureIcon = feature.icon;
                              const isEnabled = getPermissionValue(module.id, subModule.id, feature.id);
                              return (
                                <div key={feature.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                  <div className="flex items-center gap-2">
                                    <FeatureIcon className={`h-4 w-4 ${feature.color}`} />
                                    <span className="text-sm font-medium">{feature.name}</span>
                                  </div>
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={() => togglePermission(module.id, subModule.id, feature.id)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
};

export default RolePermissionMatrix;
