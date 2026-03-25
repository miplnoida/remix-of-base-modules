import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Profile {
  id: string;
  user_code: string;
  full_name: string;
}

interface ReceivedBySelectProps {
  value: string;
  onChange: (userCode: string) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  className?: string;
}

export default function ReceivedBySelect({
  value,
  onChange,
  disabled = false,
  required = false,
  label = "Received By",
  className = ""
}: ReceivedBySelectProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, user_code, full_name')
          .not('user_code', 'is', null)
          .order('full_name');

        if (fetchError) throw fetchError;

        setProfiles(data || []);
      } catch (err: any) {
        console.error('Error fetching profiles:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <Label>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <SearchableSelect
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        options={profiles.map((profile) => ({
          value: profile.user_code,
          label: `${profile.full_name} (${profile.user_code})`,
          searchText: `${profile.user_code} ${profile.full_name}`,
        }))}
        placeholder="Select user"
        searchPlaceholder="Search by name or code..."
        emptyMessage="No users found."
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
