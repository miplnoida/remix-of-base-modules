import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Construction } from "lucide-react";

const EmployerApplications = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Employer Applications</h1>
          <p className="text-muted-foreground">
            Review and manage online employer registration applications
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Construction className="h-3 w-3" />
          Coming Soon
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Employer Applications Module
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Under Development</h3>
            <p className="text-muted-foreground max-w-md">
              This module will allow you to review and process online employer 
              registration applications. The feature is currently being developed 
              and will be available soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployerApplications;
