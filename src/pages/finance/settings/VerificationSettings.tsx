import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/PageHeader';
import { SERVICE_TYPES, SERVICE_CATEGORIES } from '@/services/mockData/masterData';
import { ServiceType } from '@/types/serviceRequest';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, XCircle } from 'lucide-react';

export default function VerificationSettings() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(SERVICE_TYPES);

  const handleToggleVerification = (serviceTypeId: string, requiresVerification: boolean) => {
    setServiceTypes(prev => 
      prev.map(st => 
        st.id === serviceTypeId 
          ? { ...st, requiresVerification } 
          : st
      )
    );
    toast.success(
      requiresVerification 
        ? 'Verification enabled for this service type' 
        : 'Verification disabled for this service type'
    );
  };

  const getCategoryName = (categoryId: string) => {
    return SERVICE_CATEGORIES.find(cat => cat.id === categoryId)?.name || 'Unknown';
  };

  const groupedByCategory = SERVICE_CATEGORIES.map(category => ({
    category,
    services: serviceTypes.filter(st => st.categoryId === category.id)
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Verification Settings"
        subtitle="Configure which service types require verification/approval before invoice generation"
        breadcrumbs={[
          { label: 'Finance', href: '/finance/dashboard' },
          { label: 'Settings', href: '/finance/settings/fee-configuration' },
          { label: 'Verification Settings' }
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Verification Policy</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            When verification is enabled for a service type, all service requests of that type will be routed to "Pending Verification" 
            for approval before an invoice can be generated. When disabled, invoices are generated automatically upon submission.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {groupedByCategory.map(({ category, services }) => (
              <div key={category.id}>
                <div className="mb-3">
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
                <div className="space-y-3 pl-4 border-l-2 border-border">
                  {services.map((service) => (
                    <div 
                      key={service.id} 
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-medium">{service.name}</p>
                          <Badge variant={service.requiresVerification ? "default" : "secondary"}>
                            {service.requiresVerification ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Verification Required
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                Auto-Invoice
                              </span>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Label htmlFor={`verify-${service.id}`} className="text-sm">
                          Require Verification
                        </Label>
                        <Switch
                          id={`verify-${service.id}`}
                          checked={service.requiresVerification || false}
                          onCheckedChange={(checked) => handleToggleVerification(service.id, checked)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verification Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Approval Authority</h4>
              <p className="text-sm text-muted-foreground">
                Officers with "Verification" permission can approve pending service requests. 
                Configure user permissions in System Administration → User Management.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Workflow Impact</h4>
              <p className="text-sm text-muted-foreground">
                When verification is required: Service Request → Pending Verification → Approval → Invoice Generation → Payment
                <br />
                When verification is not required: Service Request → Invoice Generation → Payment
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
