import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Cog, Plus, Search, Zap, Calculator, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const RuleEngine = () => {
  const [activeTab, setActiveTab] = useState('detection');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Cog className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Compliance Rule Engine</h1>
          </div>
          <p className="text-muted-foreground">
            Configure detection, calculation, and escalation rules for automated compliance enforcement
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>
      </div>

      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="detection" className="gap-2">
              <Zap className="h-4 w-4" />
              Detection Rules
            </TabsTrigger>
            <TabsTrigger value="calculation" className="gap-2">
              <Calculator className="h-4 w-4" />
              Calculation Rules
            </TabsTrigger>
            <TabsTrigger value="escalation" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Escalation Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detection">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Detection rules define triggers that automatically create violations when compliance conditions are met.
              </p>
              <div className="flex items-center justify-center h-48 border-2 border-dashed border-muted rounded-lg">
                <p className="text-muted-foreground">Detection rules will populate once database tables are created</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="calculation">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Calculation rules define how penalties, interest, and fines are computed. Financial rates are referenced from C3 Configuration.
              </p>
              <div className="flex items-center justify-center h-48 border-2 border-dashed border-muted rounded-lg">
                <p className="text-muted-foreground">Calculation rules will populate once database tables are created</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="escalation">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Escalation rules define when violations or cases are automatically escalated based on time, amount, or status conditions.
              </p>
              <div className="flex items-center justify-center h-48 border-2 border-dashed border-muted rounded-lg">
                <p className="text-muted-foreground">Escalation rules will populate once database tables are created</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default RuleEngine;
