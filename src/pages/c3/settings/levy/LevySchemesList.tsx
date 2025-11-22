import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Copy, 
  Ban, 
  Check, 
  Search,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { levySettingsService } from "@/services/levySettingsService";
import { LevyScheme } from "@/types/levySettings";

export default function LevySchemesList() {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState<LevyScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    loadSchemes();
  }, [statusFilter]);

  const loadSchemes = async () => {
    setLoading(true);
    try {
      const data = await levySettingsService.getLevySchemes({ status: statusFilter });
      setSchemes(data);
    } catch (error) {
      toast.error("Failed to load levy schemes");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (schemeId: string) => {
    navigate(`/c3-management/settings/levy/schemes/${schemeId}`);
  };

  const handleClone = async (schemeId: string) => {
    const schemeName = prompt("Enter name for cloned scheme:");
    if (!schemeName) return;
    
    const effectiveFrom = prompt("Enter effective from date (YYYY-MM-DD):");
    if (!effectiveFrom) return;

    try {
      const cloned = await levySettingsService.cloneLevyScheme(schemeId, schemeName, effectiveFrom);
      toast.success(`Scheme cloned successfully: ${cloned.schemeName}`);
      loadSchemes();
    } catch (error) {
      toast.error("Failed to clone scheme");
    }
  };

  const handleDeactivate = async (schemeId: string) => {
    if (!confirm("Are you sure you want to deactivate this scheme?")) return;

    try {
      await levySettingsService.updateLevyScheme(schemeId, { 
        status: 'Inactive',
        effectiveTo: new Date().toISOString().split('T')[0]
      });
      toast.success("Scheme deactivated");
      loadSchemes();
    } catch (error) {
      toast.error("Failed to deactivate scheme");
    }
  };

  const filteredSchemes = schemes.filter(scheme =>
    scheme.schemeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scheme.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Levy Settings - Schemes
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage versioned levy policy schemes and their configurations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/c3-management/settings/levy/simulator")}
            variant="outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Levy Simulator
          </Button>
          <Button
            onClick={() => navigate("/c3-management/settings/levy/schemes/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Scheme
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-card p-4 rounded-lg border">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search schemes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Schemes</SelectItem>
            <SelectItem value="Current">Current Only</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scheme Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading schemes...
                </TableCell>
              </TableRow>
            ) : filteredSchemes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No schemes found
                </TableCell>
              </TableRow>
            ) : (
              filteredSchemes.map((scheme) => (
                <TableRow key={scheme.schemeId}>
                  <TableCell className="font-medium">
                    {scheme.schemeName}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {scheme.description}
                  </TableCell>
                  <TableCell>
                    {new Date(scheme.effectiveFrom).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {scheme.effectiveTo 
                      ? new Date(scheme.effectiveTo).toLocaleDateString()
                      : <span className="text-muted-foreground">Open</span>
                    }
                  </TableCell>
                  <TableCell>
                    {scheme.isCurrent && (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" />
                        Yes
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={scheme.status === 'Active' ? 'default' : 'secondary'}>
                      {scheme.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(scheme.schemeId)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClone(scheme.schemeId)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {scheme.status === 'Active' && !scheme.isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeactivate(scheme.schemeId)}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
