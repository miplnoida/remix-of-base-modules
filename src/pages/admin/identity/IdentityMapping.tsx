import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link, RefreshCw, Search, ArrowRight, CheckCircle } from "lucide-react";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions } from "@/hooks/useActionPermission";
import { format } from "date-fns";

const MODULE_NAME = "identity_map";

interface IdentityMapping {
  id: string;
  legacy_user_id: string;
  identity_user_id: string;
  generated_user_code: string;
  supabase_auth_id: string | null;
  migration_date: string;
  migration_notes: string | null;
  // Joined data
  legacy_email: string | null;
  legacy_name: string | null;
  identity_email: string | null;
  identity_name: string | null;
}

const IdentityMappingContent = () => {
  const { can } = useActionPermissions(MODULE_NAME);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch mappings with user details
  const { data: mappings = [], isLoading, refetch } = useQuery({
    queryKey: ["identity-mappings"],
    queryFn: async () => {
      // Get mappings
      const { data: mapData, error: mapError } = await supabase
        .from("user_identity_map")
        .select("*")
        .order("migration_date", { ascending: false });
      
      if (mapError) throw mapError;

      // Enrich with user data
      const enrichedMappings: IdentityMapping[] = [];
      
      for (const mapping of mapData || []) {
        // Get legacy profile
        const { data: legacyData } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", mapping.legacy_user_id)
          .single();

        // Get identity user
        const { data: identityData } = await supabase
          .from("AspNetUsers")
          .select("Email, full_name")
          .eq("Id", mapping.identity_user_id)
          .single();

        enrichedMappings.push({
          ...mapping,
          legacy_email: legacyData?.email || null,
          legacy_name: legacyData?.full_name || null,
          identity_email: (identityData as any)?.Email || null,
          identity_name: (identityData as any)?.full_name || null,
        });
      }
      
      return enrichedMappings;
    },
  });

  const filteredMappings = mappings.filter(m =>
    (m.generated_user_code?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (m.legacy_email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (m.identity_email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (m.legacy_name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading mappings...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Identity Mapping</h1>
          <p className="text-muted-foreground">View legacy to Microsoft Identity user mappings</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{mappings.length}</div>
            <p className="text-xs text-muted-foreground">Total Mappings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {mappings.filter(m => m.supabase_auth_id).length}
            </div>
            <p className="text-xs text-muted-foreground">With Auth Link</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {new Set(mappings.map(m => m.generated_user_code)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique User Codes</p>
          </CardContent>
        </Card>
      </div>

      {/* Mappings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Mappings</CardTitle>
              <CardDescription>Legacy user to Identity user mappings</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, email, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Code</TableHead>
                <TableHead>Legacy User</TableHead>
                <TableHead></TableHead>
                <TableHead>Identity User</TableHead>
                <TableHead>Auth Linked</TableHead>
                <TableHead>Migration Date</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono font-bold">
                      {mapping.generated_user_code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{mapping.legacy_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{mapping.legacy_email}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {mapping.legacy_user_id.substring(0, 8)}...
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{mapping.identity_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{mapping.identity_email}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {mapping.identity_user_id.substring(0, 8)}...
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {mapping.supabase_auth_id ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Linked
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Not Linked</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(mapping.migration_date), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {mapping.migration_notes || "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filteredMappings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No mappings found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const IdentityMapping = () => {
  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <IdentityMappingContent />
    </PermissionWrapper>
  );
};

export default IdentityMapping;
