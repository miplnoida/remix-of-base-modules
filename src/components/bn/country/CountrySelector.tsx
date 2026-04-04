import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { useBnCountries } from '@/hooks/bn/useBnConfig';
import { useBnCountry } from '@/contexts/BnCountryContext';

const CountrySelector: React.FC = () => {
  const { activeCountryCode, setActiveCountryCode } = useBnCountry();
  const { data: countries = [] } = useBnCountries();
  const activeCountries = countries.filter((c: any) => c.is_active);

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={activeCountryCode} onValueChange={setActiveCountryCode}>
        <SelectTrigger className="w-[200px] h-8 text-sm">
          <SelectValue placeholder="Select country" />
        </SelectTrigger>
        <SelectContent>
          {activeCountries.map((c: any) => (
            <SelectItem key={c.country_code} value={c.country_code}>
              {c.country_name} ({c.currency_code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CountrySelector;
