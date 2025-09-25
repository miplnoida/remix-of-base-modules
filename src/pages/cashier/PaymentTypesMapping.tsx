import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Trash2, Save, X, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentTypeMapping {
  id: string;
  sssPaymentType: string;
  sssDescription: string;
  sagePaymentMethod: string;
  sageDescription: string;
  glAccount: string;
  category: string;
  status: 'active' | 'inactive';
}

const PaymentTypesMapping = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<PaymentTypeMapping | null>(null);

  const [mappings] = useState<PaymentTypeMapping[]>([
    {
      id: '1',
      sssPaymentType: 'CASH',
      sssDescription: 'Cash Payment',
      sagePaymentMethod: 'CA',
      sageDescription: 'Cash',
      glAccount: '1010',
      category: 'Direct Payment',
      status: 'active'
    },
    {
      id: '2',
      sssPaymentType: 'CHECK',
      sssDescription: 'Check Payment',
      sagePaymentMethod: 'CK',
      sageDescription: 'Check',
      glAccount: '1020',
      category: 'Bank Transfer',
      status: 'active'
    },
    {
      id: '3',
      sssPaymentType: 'EFT',
      sssDescription: 'Electronic Funds Transfer',
      sagePaymentMethod: 'EF',
      sageDescription: 'Electronic Transfer',
      glAccount: '1030',
      category: 'Electronic',
      status: 'active'
    },
    {
      id: '4',
      sssPaymentType: 'CARD',
      sssDescription: 'Credit/Debit Card',
      sagePaymentMethod: 'CC',
      sageDescription: 'Credit Card',
      glAccount: '1040',
      category: 'Card Payment',
      status: 'inactive'
    }
  ]);

  const filteredMappings = mappings.filter(mapping =>
    mapping.sssDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mapping.sageDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mapping.sssPaymentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mapping.sagePaymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveMapping = () => {
    toast({
      title: "Mapping Saved",
      description: "Payment type mapping has been saved successfully.",
    });
    setIsDialogOpen(false);
    setEditingMapping(null);
  };

  const handleSync = () => {
    toast({
      title: "Synchronization Started",
      description: "Payment types synchronization with Sage has been initiated.",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Types Mapping</h1>
          <p className="text-muted-foreground">Map SSS payment types to Sage payment methods</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSync} variant="outline">
            <CreditCard className="h-4 w-4 mr-2" />
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
                <DialogTitle>{editingMapping ? 'Edit' : 'Add'} Payment Type Mapping</DialogTitle>
                <DialogDescription>
                  Configure the mapping between SSS and Sage payment types.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="font-semibold">SSS Payment Type</h3>
                  <div className="space-y-2">
                    <Label htmlFor="sss-payment-type">Payment Type Code</Label>
                    <Input id="sss-payment-type" placeholder="CASH" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sss-description">Description</Label>
                    <Input id="sss-description" placeholder="Cash Payment" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Sage Payment Method</h3>
                  <div className="space-y-2">
                    <Label htmlFor="sage-method">Method Code</Label>
                    <Input id="sage-method" placeholder="CA" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sage-description">Description</Label>
                    <Input id="sage-description" placeholder="Cash" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gl-account">GL Account</Label>
                  <Input id="gl-account" placeholder="1010" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct-payment">Direct Payment</SelectItem>
                      <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                      <SelectItem value="electronic">Electronic</SelectItem>
                      <SelectItem value="card-payment">Card Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
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
          <CardTitle>Payment Type Mappings</CardTitle>
          <CardDescription>
            Current mappings between SSS and Sage payment types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by payment type or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SSS Payment Type</TableHead>
                <TableHead>Sage Payment Method</TableHead>
                <TableHead>GL Account</TableHead>
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
                      <div className="font-medium">{mapping.sssPaymentType}</div>
                      <div className="text-sm text-muted-foreground">{mapping.sssDescription}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{mapping.sagePaymentMethod}</div>
                      <div className="text-sm text-muted-foreground">{mapping.sageDescription}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{mapping.glAccount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{mapping.category}</Badge>
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

export default PaymentTypesMapping;