import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Receipt, Calendar, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BemaContributors() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Self-Employed & Voluntary Contributors</h1>
          <p className="text-muted-foreground">
            Manage contributors, generate vouchers, and track remittances
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Contributor
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contributors</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">387</div>
            <p className="text-xs text-muted-foreground">
              285 self-employed, 102 voluntary
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vouchers Generated</CardTitle>
            <Receipt className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Calendar className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">Requiring follow-up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Category Changes</CardTitle>
            <Users className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="self-employed">
        <TabsList>
          <TabsTrigger value="self-employed">Self-Employed</TabsTrigger>
          <TabsTrigger value="voluntary">Voluntary</TabsTrigger>
          <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="self-employed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Self-Employed Contributors</CardTitle>
              <CardDescription>
                Manage self-employed contribution accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Marcus Thompson", ssn: "***-**-1234", category: "cat_b", nextDue: "2025-02-15", amount: 450, status: "active" },
                  { name: "Jennifer Williams", ssn: "***-**-5678", category: "cat_c", nextDue: "2025-02-20", amount: 680, status: "active" },
                  { name: "Robert Davis", ssn: "***-**-9012", category: "cat_a", nextDue: "2025-01-30", amount: 320, status: "overdue" },
                ].map((contributor, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{contributor.name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>SSN: {contributor.ssn}</span>
                        <span>•</span>
                        <span>Category: {contributor.category.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Next payment</p>
                        <p className="font-medium">${contributor.amount}</p>
                        <p className="text-xs text-muted-foreground">{contributor.nextDue}</p>
                      </div>
                      <Badge variant={contributor.status === "overdue" ? "destructive" : "default"}>
                        {contributor.status}
                      </Badge>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voluntary">
          <Card>
            <CardHeader>
              <CardTitle>Voluntary Contributors</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Voluntary contributor accounts will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vouchers">
          <Card>
            <CardHeader>
              <CardTitle>Payment Vouchers</CardTitle>
              <CardDescription>
                Generate and manage pre-payment vouchers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button>Generate Voucher</Button>
                <Button variant="outline">Bulk Generation</Button>
                <Button variant="outline">Prorated Calculator</Button>
              </div>

              <div className="space-y-4">
                {[
                  { voucher: "VCH-2025-001", contributor: "Marcus Thompson", period: "Jan 2025", amount: 450, paid: false },
                  { voucher: "VCH-2025-002", contributor: "Jennifer Williams", period: "Jan 2025", amount: 680, paid: true },
                  { voucher: "VCH-2025-003", contributor: "Robert Davis", period: "Jan 2025", amount: 320, paid: false },
                ].map((voucher, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-medium">{voucher.contributor}</p>
                        <Badge variant="outline">{voucher.voucher}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Period: {voucher.period}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">${voucher.amount}</p>
                      </div>
                      <Badge variant={voucher.paid ? "default" : "secondary"}>
                        {voucher.paid ? "Paid" : "Unpaid"}
                      </Badge>
                      <Button variant="outline" size="sm">Print</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Category Changes</CardTitle>
              <CardDescription>
                Manage contribution category change requests (twice per year, age-restricted)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Contributors can change categories up to twice per year. Age restrictions apply for certain categories.
                  </p>
                </div>
                <p className="text-muted-foreground">Category change requests will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
