import { ShieldX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface AccessDeniedProps {
  message?: string;
  showBackButton?: boolean;
}

export function AccessDenied({ 
  message = "You don't have permission to access this page.", 
  showBackButton = true 
}: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 p-4 rounded-full bg-destructive/10">
            <ShieldX className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription className="text-base mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showBackButton && (
            <Button variant="outline" onClick={() => navigate(-1)} className="mt-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
