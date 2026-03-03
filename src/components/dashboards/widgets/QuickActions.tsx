import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Building2,
  FileText,
  Search,
  ClipboardCheck,
  DollarSign,
  Zap,
} from 'lucide-react';

const actions = [
  { label: 'Register Employer', icon: Building2, path: '/compliance/employers' },
  { label: 'New IP Application', icon: UserPlus, path: '/registration' },
  { label: 'Process Claims', icon: FileText, path: '/benefits' },
  { label: 'Search Records', icon: Search, path: '/search' },
  { label: 'View Compliance', icon: ClipboardCheck, path: '/compliance' },
  { label: 'Financial Reports', icon: DollarSign, path: '/reports' },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Zap className="h-5 w-5 text-accent" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {actions.map((action, i) => (
            <Button
              key={i}
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2 text-xs font-medium hover:bg-primary/5 hover:border-primary/30"
              onClick={() => navigate(action.path)}
            >
              <action.icon className="h-5 w-5 text-primary" />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
