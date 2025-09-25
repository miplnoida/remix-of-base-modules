import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AccountMapping {
  id: string;
  sssAccount: string;
  sssAccountName: string;
  sageAccount: string;
  sageAccountName: string;
  category: string;
  status: 'active' | 'inactive';
}

const ChartAccountsMapping = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<AccountMapping | null>(null);

  const [mappings] = useState<AccountMapping[]>([
    {
      id: '1',
      sssAccount: '1010',
      sssAccountName: 'Cash at Bank - Operations',
      sageAccount: '1000',
      sageAccountName: 'Petty Cash',
      category: 'Assets',
      status: 'active'
    },
    {
      id: '2',
      sssAccount: '4010',
      sssAccountName: 'Contribution Revenue',
      sageAccount: '4000',
      sageAccountName: 'Sales Revenue',
      category: 'Revenue',
      status: 'active'
    },
    {
      id: '3',
      sssAccount: '5010',
      sssAccountName: 'Administrative Expenses',
      sageAccount: '5000',
      sageAccountName: 'Office Expenses',
      category: 'Expenses',
      status: 'inactive'
    }
  ]);

  const filteredMappings = mappings.filter(mapping =>
    mapping.sssAccountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mapping.sageAccountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mapping.sssAccount.includes(searchTerm) ||
    mapping.sageAccount.includes(searchTerm)
  );

  const handleSaveMapping = () => {
    toast({
      title: "Mapping Saved",
      description: "Chart of accounts mapping has been saved successfully.",
    });
    setIsDialogOpen(false);
    setEditingMapping(null);
  };

  const handleSync = () => {
    toast({
      title: "Synchronization Started",
      description: "Chart of accounts synchronization with Sage has been initiated.",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts Mapping</h1>
          <p className="text-muted-foreground">Map SSS chart of accounts to Sage accounts</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSync} variant="outline">
            Sync with Sage
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Mapping
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingMapping ? 'Edit' : 'Add'} Account Mapping</DialogTitle>
                <DialogDescription>
                  Configure the mapping between SSS and Sage chart of accounts.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="font-semibold">SSS Account</h3>
                  <div className="space-y-2">
                    <Label htmlFor="sss-account">Account Code</Label>
                    <Input id="sss-account" placeholder="1010" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sss-account-name">Account Name</Label>
                    <Input id="sss-account-name" placeholder="Cash at Bank - Operations" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Sage Account</h3>
                  <div className="space-y-2">
                    <Label htmlFor="sage-account">Account Code</Label>
                    <Input id="sage-account" placeholder="1000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sage-account-name">Account Name</Label>
                    <Input id="sage-account-name" placeholder="Petty Cash" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assets">Assets</SelectItem>
                      <SelectItem value="liabilities">Liabilities</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expenses">Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveMapping}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Mapping
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Mappings</CardTitle>
          <CardDescription>
            Current mappings between SSS and Sage chart of accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by account code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SSS Account</TableHead>
                <TableHead>Sage Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{mapping.sssAccount}</div>
                      <div className="text-sm text-muted-foreground">{mapping.sssAccountName}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{mapping.sageAccount}</div>
                      <div className="text-sm text-muted-foreground">{mapping.sageAccountName}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{mapping.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={mapping.status === 'active' ? 'default' : 'secondary'}>
                      {mapping.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setEditingMapping(mapping);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartAccountsMapping;