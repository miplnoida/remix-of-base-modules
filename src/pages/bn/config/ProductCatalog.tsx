import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Copy, Archive } from 'lucide-react';
import { useBnProducts } from '@/hooks/bn/useBnProduct';
import { BN_PRODUCT_STATUS_LABELS } from '@/types/bn';
import type { BnProduct, BnProductStatus } from '@/types/bn';

const statusVariant: Record<BnProductStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  ACTIVE: 'default',
  SUSPENDED: 'destructive',
  ARCHIVED: 'outline',
};

export default function ProductCatalog() {
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useBnProducts();
  const [search, setSearch] = useState('');

  const filtered = products.filter(
    (p: BnProduct) =>
      p.benefit_name.toLowerCase().includes(search.toLowerCase()) ||
      p.benefit_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Benefit Product Catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage benefit types, versions, and configuration rules
          </p>
        </div>
        <Button onClick={() => navigate('/bn/config/products/new')} className="gap-2">
          <Plus className="h-4 w-4" /> New Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Products ({filtered.length})</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Loading products...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {search ? 'No products match your search.' : 'No benefit products configured yet. Click "New Product" to get started.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product: BnProduct) => (
                  <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/bn/config/products/${product.id}`)}>
                    <TableCell className="font-mono text-sm">{product.benefit_code}</TableCell>
                    <TableCell className="font-medium">{product.benefit_name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.branch}</TableCell>
                    <TableCell>{product.payment_type}</TableCell>
                    <TableCell>{product.country_code}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[product.status as BnProductStatus] || 'outline'}>
                        {BN_PRODUCT_STATUS_LABELS[product.status as BnProductStatus] || product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/bn/config/products/${product.id}`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
