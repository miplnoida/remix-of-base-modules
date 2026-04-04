import React from 'react';
import CalcSimulationPanel from '@/components/bn/engine/CalcSimulationPanel';

export default function CalculationEngine() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calculation Engine</h1>
        <p className="text-muted-foreground">Run, simulate, and audit benefit calculations across all product types.</p>
      </div>
      <CalcSimulationPanel />
    </div>
  );
}
