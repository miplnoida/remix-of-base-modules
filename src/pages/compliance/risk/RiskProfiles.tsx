import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Target, Search, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const RiskProfiles = () => {
  const bands = [
    { label: 'Low', count: '—', color: 'bg-success/10 text-success border-success/20' },
    { label: 'Medium', count: '—', color: 'bg-warning/10 text-warning border-warning/20' },
    { label: 'High', count: '—', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    { label: 'Critical', count: '—', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Employer Risk Profiles</h1>
        </div>
        <p className="text-muted-foreground">
          Risk scoring and band classification for all registered employers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {bands.map((band) => (
          <Card key={band.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={band.color}>{band.label}</Badge>
                <span className="text-2xl font-bold text-foreground">{band.count}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">employers</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by employer name or ID..." className="pl-10" />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground">Risk profiles will populate once database tables are created</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskProfiles;
