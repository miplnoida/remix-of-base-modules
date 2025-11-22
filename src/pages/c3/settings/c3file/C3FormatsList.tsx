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
import { c3FileConfigService } from '@/services/c3FileConfigService';
import type { C3FormatScheme } from '@/types/c3FileConfig';
import { toast } from 'sonner';

export default function C3FormatsList() {
  const navigate = useNavigate();
  const [formats, setFormats] = useState<C3FormatScheme[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadFormats();
  }, []);

  const loadFormats = async () => {
    const data = await c3FileConfigService.getFormats();
    setFormats(data);
  };

  const filteredFormats = formats.filter((format) => {
    const matchesSearch =
      format.formatName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      format.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && format.status === 'Active') ||
      (filter === 'inactive' && format.status === 'Inactive');

    return matchesSearch && matchesFilter;
  });

  const handleCreate = () => {
    navigate('/c3-management/settings/c3file/formats/new');
  };

  const handleEdit = (formatId: string) => {
    navigate(`/c3-management/settings/c3file/formats/${formatId}`);
  };

  const handleDelete = async (formatId: string) => {
    if (confirm('Are you sure you want to delete this format?')) {
      await c3FileConfigService.deleteFormat(formatId);
      toast.success('Format deleted successfully');
      loadFormats();
    }
  };

  const handleClone = async (format: C3FormatScheme) => {
    const newFormat = await c3FileConfigService.createFormat({
      formatName: `${format.formatName} (Copy)`,
      description: format.description,
      inputType: format.inputType,
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: null,
      isDefault: false,
      status: 'Inactive',
      createdBy: 'Current User',
    });
    toast.success('Format cloned successfully');
    navigate(`/c3-management/settings/c3file/formats/${newFormat.formatId}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">C3 File Configuration</h1>
          <p className="text-muted-foreground">
            Manage C3 file formats, column mappings, and validation rules
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Format
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search formats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Format Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Input Type</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFormats.map((format) => (
              <TableRow key={format.formatId}>
                <TableCell className="font-medium">{format.formatName}</TableCell>
                <TableCell>{format.description}</TableCell>
                <TableCell>
                  <Badge variant="outline">{format.inputType}</Badge>
                </TableCell>
                <TableCell>{format.effectiveFrom}</TableCell>
                <TableCell>{format.effectiveTo || 'Open'}</TableCell>
                <TableCell>
                  {format.isDefault ? (
                    <Badge variant="default">Yes</Badge>
                  ) : (
                    <Badge variant="secondary">No</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={format.status === 'Active' ? 'default' : 'secondary'}>
                    {format.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(format.formatId)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClone(format)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(format.formatId)}
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
