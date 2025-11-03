import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ActivityItem } from '@/adapters/legalDashboardAdapter';
import { FileText, AlertCircle, Calendar, FileEdit, DollarSign, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityProps {
  data: ActivityItem[] | null;
  loading: boolean;
  onActivityClick?: (activity: ActivityItem) => void;
}

export function RecentActivity({ data, loading, onActivityClick }: RecentActivityProps) {
  const [filter, setFilter] = useState<ActivityItem['type'] | 'all'>('all');
  const navigate = useNavigate();

  if (loading || !data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'doc':
        return <FileText className="h-4 w-4" />;
      case 'status':
        return <AlertCircle className="h-4 w-4" />;
      case 'hearing':
        return <Calendar className="h-4 w-4" />;
      case 'note':
        return <FileEdit className="h-4 w-4" />;
      case 'payment':
        return <DollarSign className="h-4 w-4" />;
      case 'order':
        return <Scale className="h-4 w-4" />;
    }
  };

  const getIconColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'doc':
        return 'text-blue-600';
      case 'status':
        return 'text-orange-600';
      case 'hearing':
        return 'text-purple-600';
      case 'note':
        return 'text-green-600';
      case 'payment':
        return 'text-emerald-600';
      case 'order':
        return 'text-indigo-600';
    }
  };

  const filteredData = filter === 'all' ? data : data.filter(item => item.type === filter);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Recent Activity
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('all')}
            >
              All
            </Badge>
            <Badge
              variant={filter === 'doc' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('doc')}
            >
              Docs
            </Badge>
            <Badge
              variant={filter === 'hearing' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('hearing')}
            >
              Hearings
            </Badge>
            <Badge
              variant={filter === 'status' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('status')}
            >
              Status
            </Badge>
            <Badge
              variant={filter === 'note' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('note')}
            >
              Notes
            </Badge>
            <Badge
              variant={filter === 'payment' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('payment')}
            >
              Finance
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredData.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No activity found
            </div>
          ) : (
            filteredData.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-border"
                onClick={() => {
                  if (onActivityClick) {
                    onActivityClick(item);
                  } else {
                    navigate(`/legal/cases/${item.caseId}`);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className={`mt-0.5 ${getIconColor(item.type)}`}>
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{item.caseNumber}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.action}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
