import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BemaWaivers() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Waivers & Legal Escalation</h1>
          <p className="text-muted-foreground">Waiver requests & approval workflow</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />New Waiver Request</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Pending", value: 8, icon: Shield },
          { label: "Manager Review", value: 5, icon: Shield },
          { label: "Legal Review", value: 3, icon: Shield },
          { label: "Approved", value: 12, icon: Shield }
        ].map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stat.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Waiver Requests</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Employer Name {i}</p>
                  <p className="text-sm text-muted-foreground">Amount: $5,000 | Penalties: $1,200</p>
                </div>
                <div className="flex gap-2">
                  <Badge>Pending</Badge>
                  <Button variant="outline" size="sm">Review</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
