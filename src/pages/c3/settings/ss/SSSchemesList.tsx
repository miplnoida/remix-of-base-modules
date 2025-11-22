import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Copy, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAllSchemes } from '@/services/ssSettingsService';

export default function SSSchemesList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');

  const schemes = getAllSchemes();

  const filteredSchemes = schemes.filter(scheme => {
    const matchesSearch = scheme.schemeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scheme.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || scheme.status === statusFilter;
    
    const now = new Date();
    const effectiveFrom = new Date(scheme.effectiveFrom);
    const effectiveTo = scheme.effectiveTo ? new Date(scheme.effectiveTo) : null;
    
    let matchesTime = true;
    if (timeFilter === 'current') {
      matchesTime = effectiveFrom <= now && (!effectiveTo || effectiveTo >= now);
    } else if (timeFilter === 'past') {
      matchesTime = effectiveTo !== null && effectiveTo < now;
    } else if (timeFilter === 'future') {
      matchesTime = effectiveFrom > now;
    }
    
    return matchesSearch && matchesStatus && matchesTime;
  });

  const handleCreate = () => {
    navigate('/c3-management/settings/ss/schemes/new');
  };

  const handleEdit = (schemeId: string) => {
    navigate(`/c3-management/settings/ss/schemes/${schemeId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Social Security Contribution Schemes</h1>
          <p className="text-muted-foreground mt-1">
            Manage versioned Social Security contribution rules and configurations
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Scheme
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search schemes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Periods</SelectItem>
            <SelectItem value="current">Current</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="future">Future</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchemes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No schemes found. Create your first scheme to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredSchemes.map((scheme) => (
                <TableRow key={scheme.schemeId}>
                  <TableCell className="font-medium">{scheme.schemeName}</TableCell>
                  <TableCell className="max-w-xs truncate">{scheme.description}</TableCell>
                  <TableCell>{new Date(scheme.effectiveFrom).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {scheme.effectiveTo ? new Date(scheme.effectiveTo).toLocaleDateString() : 'Open'}
                  </TableCell>
                  <TableCell>
                    {scheme.isCurrent ? (
                      <Badge variant="default">Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={scheme.status === 'Active' ? 'default' : 'secondary'}>
                      {scheme.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(scheme.schemeId)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                      {scheme.status === 'Active' && !scheme.isCurrent && (
                        <Button variant="ghost" size="sm">
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
