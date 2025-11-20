import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { riskPolicyService } from '@/services/riskPolicyService';
import { RiskBand, RiskBandName } from '@/types/riskPolicy';
import { toast } from 'sonner';
import { Edit } from 'lucide-react';
import RiskBandEditDialog from '@/components/compliance/risk-policy/RiskBandEditDialog';

export default function RiskBandsTab() {
  const [bands, setBands] = useState<RiskBand[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePolicy, setActivePolicy] = useState<string | null>(null);
  const [editingBand, setEditingBand] = useState<RiskBand | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadBands();
  }, []);

  const loadBands = async () => {
    try {
      setLoading(true);
      const policyData = await riskPolicyService.getPolicyHistory();
      if (policyData.activePolicy) {
        setActivePolicy(policyData.activePolicy.id);
        const bandsData = await riskPolicyService.getBandsForPolicy(policyData.activePolicy.id);
        setBands(bandsData);
      }
    } catch (error) {
      toast.error('Failed to load risk bands');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBand = async (band: RiskBand) => {
    await riskPolicyService.updateBand(band.id, band);
    await loadBands();
  };

  const handleEdit = (band: RiskBand) => {
    setEditingBand(band);
    setDialogOpen(true);
  };

  const getBandColor = (bandName: RiskBandName) => {
    switch (bandName) {
      case RiskBandName.LOW:
        return 'bg-green-100 text-green-800 border-green-200';
      case RiskBandName.MEDIUM:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case RiskBandName.HIGH:
        return 'bg-red-100 text-red-800 border-red-200';
      case RiskBandName.CRITICAL:
        return 'bg-red-200 text-red-900 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading risk bands...</div>;
  }

  if (!activePolicy) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active risk policy found. Please create and activate a policy first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Risk Bands & Behaviour Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure score ranges and behaviour rules for each risk band
        </p>
      </div>

      {/* Risk Band Cards */}
      <div className="grid gap-6">
        {bands.map((band) => (
          <Card key={band.id} className={`p-6 border-2 ${getBandColor(band.bandName)}`}>
            <div className="space-y-6">
              {/* Band Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge
                    className={`text-lg px-4 py-1 ${getBandColor(band.bandName)}`}
                    variant="outline"
                  >
                    {band.bandName}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    Score Range: {band.scoreRangeMin} - {band.scoreRangeMax}
                  </div>
                </div>
                <Button size="sm" onClick={() => handleEdit(band)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Band
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editingBand && (
        <RiskBandEditDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          band={editingBand}
          onSave={handleSaveBand}
        />
      )}
    </div>
  );
}
