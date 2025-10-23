import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Calendar, User, Building2, DollarSign, Clock, CheckCircle } from 'lucide-react';

const OpenBatch = () => {
  const [opening, setOpening] = useState(false);
  const [formData, setFormData] = useState({
    cashierName: 'Jane Doe',
    office: 'Basseterre',
    openingCashXCD: '',
    openingCashUSD: '',
  });

  const handleOpenBatch = () => {
    if (!formData.openingCashXCD || !formData.openingCashUSD) {
      toast.error('Please enter opening balances for both currencies');
      return;
    }

    setOpening(true);
    setTimeout(() => {
      toast.success('Batch opened successfully!', {
        description: `Batch #${new Date().getTime()} is now active`,
      });
      setOpening(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
          Open Cashier Batch
        </h1>
        <p className="text-muted-foreground mt-1">Start your daily cashiering session</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Batch Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <AlertDescription>
                Opening a new batch will lock this session to your user account. Ensure all previous batches are properly closed.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cashier">Cashier Name</Label>
                <Input
                  id="cashier"
                  value={formData.cashierName}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="office">Office Location</Label>
                <Select value={formData.office} onValueChange={(value) => setFormData({...formData, office: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Basseterre">Basseterre</SelectItem>
                    <SelectItem value="Charlestown">Charlestown</SelectItem>
                    <SelectItem value="Sandy Point">Sandy Point</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="text"
                  value={new Date().toLocaleDateString()}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="text"
                  value={new Date().toLocaleTimeString()}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Opening Float
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="xcd">Opening Cash (XCD)</Label>
                  <Input
                    id="xcd"
                    type="number"
                    placeholder="0.00"
                    value={formData.openingCashXCD}
                    onChange={(e) => setFormData({...formData, openingCashXCD: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usd">Opening Cash (USD)</Label>
                  <Input
                    id="usd"
                    type="number"
                    placeholder="0.00"
                    value={formData.openingCashUSD}
                    onChange={(e) => setFormData({...formData, openingCashUSD: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleOpenBatch} 
                disabled={opening}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80"
              >
                {opening ? 'Opening Batch...' : 'Open Batch'}
              </Button>
              <Button variant="outline" className="flex-1">
                Reopen Last Batch
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-primary/10 h-fit">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Identity Verification</h4>
                <p className="text-sm text-muted-foreground">Your user session is automatically detected and locked to this batch.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-primary/10 h-fit">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Opening Float</h4>
                <p className="text-sm text-muted-foreground">Enter the physical cash in your drawer at the start of your shift.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-primary/10 h-fit">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Session Lock</h4>
                <p className="text-sm text-muted-foreground">Only one active batch per cashier. Ensure previous batch is closed.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-primary/10 h-fit">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Supervisor Override</h4>
                <p className="text-sm text-muted-foreground">Supervisor approval may be required to reopen a closed batch.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Batches */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Recent Batch History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { id: 'BATCH-2025-156', date: '2025-10-22', status: 'Closed', amount: 'XCD 45,230' },
              { id: 'BATCH-2025-155', date: '2025-10-21', status: 'Closed', amount: 'XCD 38,950' },
              { id: 'BATCH-2025-154', date: '2025-10-20', status: 'Closed', amount: 'XCD 52,180' },
            ].map((batch) => (
              <div key={batch.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <p className="font-semibold">{batch.id}</p>
                  <p className="text-sm text-muted-foreground">{batch.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{batch.amount}</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600">
                    {batch.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OpenBatch;
