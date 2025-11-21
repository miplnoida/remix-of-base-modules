import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, TrendingUp, AlertCircle } from 'lucide-react';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  isActive: boolean;
  decimalPlaces: number;
}

interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
  expiryDate?: string;
  isActive: boolean;
  createdBy: string;
  createdDate: string;
}

const MultiCurrencySettings = () => {
  const [currencies, setCurrencies] = useState<Currency[]>([
    {
      id: '1',
      code: 'XCD',
      name: 'Eastern Caribbean Dollar',
      symbol: 'XCD',
      isBase: true,
      isActive: true,
      decimalPlaces: 2
    },
    {
      id: '2',
      code: 'USD',
      name: 'United States Dollar',
      symbol: '$',
      isBase: false,
      isActive: true,
      decimalPlaces: 2
    },
    {
      id: '3',
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      isBase: false,
      isActive: false,
      decimalPlaces: 2
    }
  ]);

  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([
    {
      id: '1',
      fromCurrency: 'USD',
      toCurrency: 'XCD',
      rate: 2.70,
      effectiveDate: '2024-01-01',
      isActive: true,
      createdBy: 'Admin',
      createdDate: '2024-01-01'
    },
    {
      id: '2',
      fromCurrency: 'EUR',
      toCurrency: 'XCD',
      rate: 3.10,
      effectiveDate: '2024-01-01',
      isActive: false,
      createdBy: 'Admin',
      createdDate: '2024-01-01'
    }
  ]);

  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);

  const handleAddCurrency = () => {
    setEditingCurrency(null);
    setShowCurrencyDialog(true);
  };

  const handleEditCurrency = (currency: Currency) => {
    if (currency.isBase) {
      toast.error('Base currency (XCD) cannot be edited');
      return;
    }
    setEditingCurrency(currency);
    setShowCurrencyDialog(true);
  };

  const handleAddRate = () => {
    setEditingRate(null);
    setShowRateDialog(true);
  };

  const handleEditRate = (rate: ExchangeRate) => {
    setEditingRate(rate);
    setShowRateDialog(true);
  };

  const handleSaveCurrency = () => {
    // Validation: Cannot modify base currency
    if (editingCurrency?.isBase) {
      toast.error('Base currency (XCD) cannot be modified');
      return;
    }
    toast.success('Currency saved successfully');
    setShowCurrencyDialog(false);
  };

  const handleSaveRate = () => {
    toast.success('Exchange rate saved successfully');
    setShowRateDialog(false);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Multi-Currency Settings</h1>
        <p className="text-muted-foreground">
          Manage currencies and exchange rates. XCD (Eastern Caribbean Dollar) is the base/functional currency for all accounting.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Base Currency Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Base Currency</Label>
              <p className="text-lg font-semibold">XCD (Eastern Caribbean Dollar)</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Symbol</Label>
              <p className="text-lg font-semibold">XCD</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Decimal Places</Label>
              <p className="text-lg font-semibold">2</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-muted/50 rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> All ledger postings, statutory reports, liability statements, legal documents, and account balances are maintained in XCD. 
              Transactions in foreign currencies are converted to XCD using the applicable exchange rate at transaction date.
            </p>
          </div>
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <strong>Security:</strong> The base currency (XCD) cannot be edited or disabled once configured. This ensures data integrity across all financial records.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="currencies" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="currencies">Currency Master</TabsTrigger>
          <TabsTrigger value="rates">Exchange Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="currencies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Currency Master</CardTitle>
                  <CardDescription>Manage supported currencies in the system</CardDescription>
                </div>
                <Button onClick={handleAddCurrency}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Currency
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency Code</TableHead>
                    <TableHead>Currency Name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Decimal Places</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.map((currency) => (
                    <TableRow key={currency.id}>
                      <TableCell className="font-medium">{currency.code}</TableCell>
                      <TableCell>{currency.name}</TableCell>
                      <TableCell>{currency.symbol}</TableCell>
                      <TableCell>
                        {currency.isBase ? (
                          <Badge variant="default">Base Currency</Badge>
                        ) : (
                          <Badge variant="secondary">Foreign Currency</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {currency.isActive ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>{currency.decimalPlaces}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {currency.isBase ? (
                            <Badge variant="outline" className="text-xs">
                              Protected
                            </Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCurrency(currency)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Exchange Rates</CardTitle>
                  <CardDescription>Manage foreign currency exchange rates to XCD</CardDescription>
                </div>
                <Button onClick={handleAddRate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exchange Rate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From Currency</TableHead>
                    <TableHead>To Currency</TableHead>
                    <TableHead>Exchange Rate</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exchangeRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.fromCurrency}</TableCell>
                      <TableCell className="font-medium">{rate.toCurrency}</TableCell>
                      <TableCell className="font-mono">{rate.rate.toFixed(4)}</TableCell>
                      <TableCell>{new Date(rate.effectiveDate).toLocaleDateString()}</TableCell>
                      <TableCell>{rate.expiryDate ? new Date(rate.expiryDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        {rate.isActive ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>{rate.createdBy}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRate(rate)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Currency Dialog */}
      <Dialog open={showCurrencyDialog} onOpenChange={setShowCurrencyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCurrency ? 'Edit Currency' : 'Add New Currency'}</DialogTitle>
            <DialogDescription>
              Add or modify foreign currency configuration
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editingCurrency?.isBase && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <strong>Warning:</strong> Base currency (XCD) cannot be modified. This dialog is read-only.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency Code *</Label>
                <Input 
                  placeholder="e.g., USD" 
                  defaultValue={editingCurrency?.code}
                  disabled={editingCurrency?.isBase}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency Symbol *</Label>
                <Input 
                  placeholder="e.g., $" 
                  defaultValue={editingCurrency?.symbol}
                  disabled={editingCurrency?.isBase}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Currency Name *</Label>
              <Input 
                placeholder="e.g., United States Dollar" 
                defaultValue={editingCurrency?.name}
                disabled={editingCurrency?.isBase}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Decimal Places *</Label>
                <Select 
                  defaultValue={editingCurrency?.decimalPlaces.toString() || '2'}
                  disabled={editingCurrency?.isBase}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span>Active</span>
                  <Switch 
                    defaultChecked={editingCurrency?.isActive ?? true}
                    disabled={editingCurrency?.isBase}
                  />
                </Label>
                {editingCurrency?.isBase && (
                  <p className="text-xs text-muted-foreground">
                    Base currency cannot be disabled
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCurrencyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCurrency}>Save Currency</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exchange Rate Dialog */}
      <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRate ? 'Edit Exchange Rate' : 'Add New Exchange Rate'}</DialogTitle>
            <DialogDescription>
              Configure exchange rate from foreign currency to XCD (base currency)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Currency *</Label>
                <Select defaultValue={editingRate?.fromCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.filter(c => !c.isBase && c.isActive).map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Currency</Label>
                <Input value="XCD - Eastern Caribbean Dollar" disabled className="bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Exchange Rate * (1 Foreign Currency = X XCD)</Label>
              <Input 
                type="number" 
                step="0.0001" 
                placeholder="e.g., 2.7000" 
                defaultValue={editingRate?.rate}
              />
              <p className="text-xs text-muted-foreground">
                Example: If rate is 2.7000, then 1 USD = 2.7000 XCD
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Effective Date *</Label>
                <Input 
                  type="date" 
                  defaultValue={editingRate?.effectiveDate}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date (Optional)</Label>
                <Input 
                  type="date" 
                  defaultValue={editingRate?.expiryDate}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span>Active</span>
                <Switch defaultChecked={editingRate?.isActive ?? true} />
              </Label>
              <p className="text-xs text-muted-foreground">
                Only one rate per currency pair can be active at a time
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRate}>Save Exchange Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MultiCurrencySettings;
