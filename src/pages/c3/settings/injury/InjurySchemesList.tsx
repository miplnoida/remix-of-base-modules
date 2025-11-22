import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { injurySettingsService } from '@/services/injurySettingsService';
import type { InjuryScheme } from '@/types/injurySettings';
import { toast } from 'sonner';

export default function InjurySchemesList() {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState<InjuryScheme[]>([]);
  const [filter, setFilter] = useState<'all' | 'current' | 'past' | 'future'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSchemes();
  }, []);

  const loadSchemes = async () => {
    const data = await injurySettingsService.getSchemes();
    setSchemes(data);
  };

  const filteredSchemes = schemes.filter((scheme) => {
    const matchesSearch =
      scheme.schemeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scheme.description.toLowerCase().includes(searchTerm.toLowerCase());

    const now = new Date().toISOString().split('T')[0];
    const matchesFilter =
      filter === 'all' ||
      (filter === 'current' && scheme.isCurrent) ||
      (filter === 'past' && scheme.effectiveTo && scheme.effectiveTo < now) ||
      (filter === 'future' && scheme.effectiveFrom > now);

    return matchesSearch && matchesFilter;
  });

  const handleCreate = () => {
    navigate('/c3-management/settings/injury/schemes/new');
  };

  const handleEdit = (schemeId: string) => {
    navigate(`/c3-management/settings/injury/schemes/${schemeId}`);
  };

  const handleDelete = async (schemeId: string) => {
    if (confirm('Are you sure you want to delete this scheme?')) {
      await injurySettingsService.deleteScheme(schemeId);
      toast.success('Scheme deleted successfully');
      loadSchemes();
    }
  };

  const handleClone = async (scheme: InjuryScheme) => {
    const newScheme = await injurySettingsService.createScheme({
      schemeName: `${scheme.schemeName} (Copy)`,
      description: scheme.description,
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: null,
      isCurrent: false,
      status: 'Inactive',
      createdBy: 'Current User',
    });
    toast.success('Scheme cloned successfully');
    navigate(`/c3-management/settings/injury/schemes/${newScheme.schemeId}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Employment Injury Settings</h1>
          <p className="text-muted-foreground">
            Manage versioned employment injury contribution schemes and rules
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Scheme
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search schemes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schemes</SelectItem>
            <SelectItem value="current">Current</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="future">Future</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scheme Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchemes.map((scheme) => (
              <TableRow key={scheme.schemeId}>
                <TableCell className="font-medium">{scheme.schemeName}</TableCell>
                <TableCell>{scheme.description}</TableCell>
                <TableCell>{scheme.effectiveFrom}</TableCell>
                <TableCell>{scheme.effectiveTo || 'Open'}</TableCell>
                <TableCell>
                  {scheme.isCurrent ? (
                    <Badge variant="default">Yes</Badge>
                  ) : (
                    <Badge variant="secondary">No</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={scheme.status === 'Active' ? 'default' : 'secondary'}>
                    {scheme.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(scheme.schemeId)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClone(scheme)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(scheme.schemeId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
