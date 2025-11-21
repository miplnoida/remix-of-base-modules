import { SharedBenefitLayout } from "../SharedBenefitLayout";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const OverviewTab = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Age Benefit Overview</h3>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Active Pensions</p>
        <p className="text-2xl font-bold">3,458</p>
      </div>
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Grants Paid (YTD)</p>
        <p className="text-2xl font-bold">124</p>
      </div>
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Pending Applications</p>
        <p className="text-2xl font-bold">67</p>
      </div>
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Monthly Disbursement (XCD)</p>
        <p className="text-2xl font-bold">$2.1M</p>
      </div>
    </div>
    <div className="prose max-w-none">
      <p>Age Benefit provides retirement income for insured persons who reach age 62 and meet contribution requirements.</p>
      <h4>Two Types:</h4>
      <ul>
        <li><strong>Age Pension:</strong> Monthly payments for life (requires 500+ contribution weeks)</li>
        <li><strong>Age Grant:</strong> One-time lump sum payment (requires 50-499 contribution weeks)</li>
      </ul>
      <h4>Eligibility:</h4>
      <ul>
        <li>Minimum age: 62 years</li>
        <li>Minimum contributions: 50 weeks for grant, 500 weeks for pension</li>
        <li>Must have ceased insurable employment</li>
      </ul>
    </div>
  </div>
);

const ApplicationsTab = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Age Benefit Applications</h3>
        <Button onClick={() => navigate("/nbenefit/application/age-benefit")}>
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search applications..." className="pl-10" />
        </div>
      </div>
      <div className="border rounded-lg p-4 text-center text-muted-foreground">
        Application list will be displayed here
      </div>
    </div>
  );
};

const PensionGrantRulesTab = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Pension vs Grant Rules</h3>
    <div className="grid grid-cols-2 gap-4">
      <div className="border rounded-lg p-4 space-y-2">
        <h4 className="font-semibold">Age Pension</h4>
        <div className="space-y-1 text-sm">
          <p><strong>Minimum Contributions:</strong> 500 weeks</p>
          <p><strong>Payment Type:</strong> Monthly for life</p>
          <p><strong>Calculation:</strong> Based on contribution history & average earnings</p>
          <p><strong>Indexation:</strong> Subject to COLA adjustments</p>
        </div>
      </div>
      <div className="border rounded-lg p-4 space-y-2">
        <h4 className="font-semibold">Age Grant</h4>
        <div className="space-y-1 text-sm">
          <p><strong>Contribution Range:</strong> 50-499 weeks</p>
          <p><strong>Payment Type:</strong> One-time lump sum</p>
          <p><strong>Calculation:</strong> 6 weeks of average earnings per 50 weeks contributed</p>
          <p><strong>Maximum:</strong> 54 weeks of average earnings (450+ weeks)</p>
        </div>
      </div>
    </div>
    <div className="border rounded-lg p-4">
      <label className="text-sm font-medium">Minimum Age for Both Benefits</label>
      <p className="text-2xl font-bold mt-2">62 years</p>
    </div>
    <Button>Edit Rules</Button>
  </div>
);

const CalculationRulesTab = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Benefit Calculation Rules</h3>
    <div className="space-y-4">
      <h4 className="font-semibold">Age Pension Calculation</h4>
      <div className="border rounded-lg p-4">
        <p className="text-sm">Base Formula: 30% of Average Pensionable Earnings + 1% for each 50 weeks beyond 500 weeks</p>
        <p className="text-sm mt-2"><strong>Maximum:</strong> 60% of Average Pensionable Earnings</p>
      </div>
      
      <h4 className="font-semibold">Age Grant Calculation</h4>
      <div className="border rounded-lg p-4">
        <p className="text-sm">6 weeks of Average Pensionable Earnings per 50 contribution weeks</p>
        <p className="text-sm mt-2"><strong>Example:</strong> 250 weeks = (250/50) × 6 = 30 weeks of earnings</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <label className="text-sm font-medium">Minimum Monthly Pension (XCD)</label>
          <p className="text-xl font-bold mt-2">$300.00</p>
        </div>
        <div className="border rounded-lg p-4">
          <label className="text-sm font-medium">Maximum Monthly Pension (XCD)</label>
          <p className="text-xl font-bold mt-2">$1,200.00</p>
        </div>
      </div>
      <Button>Edit Calculation Rules</Button>
    </div>
  </div>
);

const ReportsTab = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Age Benefit Reports</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Button variant="outline" className="h-auto p-4 justify-start">
        <div className="text-left">
          <p className="font-semibold">Pensions in Payment</p>
          <p className="text-sm text-muted-foreground">Active pension list by age group</p>
        </div>
      </Button>
      <Button variant="outline" className="h-auto p-4 justify-start">
        <div className="text-left">
          <p className="font-semibold">Grants Paid</p>
          <p className="text-sm text-muted-foreground">Historical grant disbursements</p>
        </div>
      </Button>
      <Button variant="outline" className="h-auto p-4 justify-start">
        <div className="text-left">
          <p className="font-semibold">Age Profile Analysis</p>
          <p className="text-sm text-muted-foreground">Retirement age trends</p>
        </div>
      </Button>
      <Button variant="outline" className="h-auto p-4 justify-start">
        <div className="text-left">
          <p className="font-semibold">Payment Projections</p>
          <p className="text-sm text-muted-foreground">Future liability estimates</p>
        </div>
      </Button>
    </div>
  </div>
);

const AgeBenefit = () => {
  const tabs = [
    { value: "overview", label: "Overview & Rules", content: <OverviewTab /> },
    { value: "applications", label: "Applications", content: <ApplicationsTab /> },
    { value: "pension-grant", label: "Pension vs Grant Rules", content: <PensionGrantRulesTab /> },
    { value: "calculation", label: "Calculation Rules", content: <CalculationRulesTab /> },
    { value: "reports", label: "Reports", content: <ReportsTab /> }
  ];

  return <SharedBenefitLayout title="Age Benefit (Pension & Grant)" tabs={tabs} />;
};

export default AgeBenefit;
