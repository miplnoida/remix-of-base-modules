import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Plus, Search, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const InspectorViolations = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const violations = [
    {
      id: '1',
      employer: 'ABC Construction Ltd',
      type: 'Missing Records',
      severity: 'high',
      date: '2024-01-15',
      status: 'open'
    },
    {
      id: '2',
      employer: 'XYZ Retail Store',
      type: 'Late Filing',
      severity: 'medium',
      date: '2024-01-10',
      status: 'pending'
    },
    {
      id: '3',
      employer: 'DEF Manufacturing',
      type: 'Incomplete Documentation',
      severity: 'low',
      date: '2024-01-08',
      status: 'resolved'
    }
  ];

  const filteredViolations = violations.filter(v => 
    v.employer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-bold">Violations</h1>
        <Button size="sm" onClick={() => navigate('/inspector/violations/new')}>
          <Plus className="h-4 w-4 mr-1" />
          Record
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search violations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <div className="space-y-2">
        {filteredViolations.map((violation) => (
          <Card key={violation.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{violation.employer}</h3>
                  <p className="text-xs text-muted-foreground">{violation.type}</p>
                </div>
                <Badge variant={getSeverityColor(violation.severity)} className="text-xs ml-2 flex-shrink-0">
                  {violation.severity}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{violation.date}</span>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredViolations.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No violations found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
