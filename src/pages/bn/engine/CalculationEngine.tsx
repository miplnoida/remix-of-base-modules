import React from 'react';
import CalcSimulationPanel from '@/components/bn/engine/CalcSimulationPanel';
import { BnScreenRoleBanner } from '@/components/bn/shared';

export default function CalculationEngine() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="t-page-title">Calculation Simulator</h1>
        <p className="text-muted-foreground">Test bench for configured formulas — run sample product test cases, view calculation trace, and compare expected vs actual.</p>
      </div>
      <BnScreenRoleBanner
        role="simulator"
        description="Simulator only — this is not the primary product calculation setup. Configure formulas inside Product Catalog → Calculation tab. Use this screen to test the configured formulas and validate against expected results."
      />
      <CalcSimulationPanel />
    </div>
  );
}
