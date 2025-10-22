import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map, Plus } from "lucide-react";
import { toast } from "sonner";

export default function BemaZones() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Zone Management</h1>
        <Button 
          className="gap-2"
          onClick={() => toast.success("New zone creation form will appear here")}
        >
          <Plus className="h-4 w-4" />
          New Zone
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Inspector Zones & Assignments</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {["Zone A", "Zone B", "Zone C"].map(zone => (
              <div key={zone} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Map className="h-8 w-8" />
                  <div>
                    <p className="font-medium">{zone}</p>
                    <p className="text-sm text-muted-foreground">3 inspectors assigned</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => toast.info(`Managing ${zone}`)}
                >
                  Manage
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
