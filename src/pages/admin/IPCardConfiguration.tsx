import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, CreditCard, Save, Loader2 } from 'lucide-react';

interface IPCardConfig {
  id: string;
  card_validity_years: number;
  date_source: string;
  is_active: boolean;
}

export default function IPCardConfiguration() {
  const [config, setConfig] = useState<IPCardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validityYears, setValidityYears] = useState(10);
  const [dateSource, setDateSource] = useState('registered_date');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ip_card_config')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig(data as IPCardConfig);
        setValidityYears(data.card_validity_years);
        setDateSource(data.date_source);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to load IP Card configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (validityYears < 1 || validityYears > 99) {
      toast.error('Card validity must be between 1 and 99 years');
      return;
    }

    setSaving(true);
    try {
      if (config?.id) {
        const { error } = await supabase
          .from('ip_card_config')
          .update({
            card_validity_years: validityYears,
            date_source: dateSource,
            updated_at: new Date().toISOString(),
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ip_card_config')
          .insert({
            card_validity_years: validityYears,
            date_source: dateSource,
            is_active: true,
          });

        if (error) throw error;
      }

      toast.success('IP Card configuration saved successfully');
      fetchConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-7 w-7" />
          IP Card Configuration
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure permanent card printing settings for insured persons
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Card Print Settings
          </CardTitle>
          <CardDescription>
            These settings apply when processing "Ready to Print Card" for verified insured persons.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Card Validity Years */}
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="validity-years" className="text-sm font-medium">
              Card Validity (Years)
            </Label>
            <Input
              id="validity-years"
              type="number"
              min={1}
              max={99}
              value={validityYears}
              onChange={(e) => setValidityYears(parseInt(e.target.value) || 1)}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Number of years the permanent card remains valid (default: 10)
            </p>
          </div>

          {/* Date Source */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Card Date Source
            </Label>
            <p className="text-xs text-muted-foreground">
              Determines which date is used as the permanent card date and start of validity period
            </p>
            <RadioGroup
              value={dateSource}
              onValueChange={setDateSource}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="registered_date" id="registered_date" className="mt-0.5" />
                <div>
                  <Label htmlFor="registered_date" className="font-medium cursor-pointer">
                    Registered Date
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Use the insured person's registration date as the card start date.
                    Card expiration = Registration date + validity years.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="card_print_date" id="card_print_date" className="mt-0.5" />
                <div>
                  <Label htmlFor="card_print_date" className="font-medium cursor-pointer">
                    Card Print Date
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Use the current date (when "Ready to Print Card" is clicked) as the card start date.
                    Card expiration = Print date + validity years.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
