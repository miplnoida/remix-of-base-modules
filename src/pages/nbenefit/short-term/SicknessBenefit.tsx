import { SharedBenefitLayout } from "../SharedBenefitLayout";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const OverviewTab = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Sickness Benefit Overview</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Active Claims</p>
        <p className="text-2xl font-bold">1,247</p>
      </div>
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Pending Applications</p>
        <p className="text-2xl font-bold">89</p>
      </div>
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Total Paid (XCD)</p>
        <p className="text-2xl font-bold">$452,890</p>
      </div>
    </div>
    <div className="prose max-w-none">
      <p>Sickness Benefit provides income replacement for insured persons temporarily unable to work due to illness or injury.</p>
      <h4>Key Rules:</h4>
      <ul>
        <li>Contribution requirement: Minimum 8 weeks in last 13 weeks</li>
        <li>Waiting period: 3 days</li>
        <li>Maximum duration: 26 weeks per illness</li>
        <li>Rate: 65% of average weekly insurable earnings</li>
      </ul>
    </div>
  </div>
);

const ApplicationsTab = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Sickness Benefit Applications</h3>
        <Button onClick={() => navigate("/nbenefit/application/sickness")}>
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

const EligibilityRulesTab = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Eligibility Rules Configuration</h3>
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <label className="text-sm font-medium">Minimum Contribution Weeks</label>
          <p className="text-2xl font-bold mt-2">8</p>
        </div>
        <div className="border rounded-lg p-4">
          <label className="text-sm font-medium">Reference Period (weeks)</label>
          <p className="text-2xl font-bold mt-2">13</p>
        </div>
        <div className="border rounded-lg p-4">
          <label className="text-sm font-medium">Waiting Days</label>
          <p className="text-2xl font-bold mt-2">3</p>
        </div>
        <div className="border rounded-lg p-4">
          <label className="text-sm font-medium">Maximum Duration (weeks)</label>
          <p className="text-2xl font-bold mt-2">26</p>
        </div>
      </div>
      <Button>Edit Rules</Button>
    </div>
  </div>
);

const CalculationRulesTab = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Benefit Calculation Rules</h3>
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <label className="text-sm font-medium">Benefit Rate</label>
        <p className="text-xl font-bold mt-2">65% of Average Weekly Insurable Earnings</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <label className="text-sm font-medium">Minimum Weekly Benefit (XCD)</label>
          <p className="text-xl font-bold mt-2">$150.00</p>
        </div>
        <div className="border rounded-lg p-4">
          <label className="text-sm font-medium">Maximum Weekly Benefit (XCD)</label>
          <p className="text-xl font-bold mt-2">$500.00</p>
        </div>
      </div>
      <Button>Edit Calculation Rules</Button>
    </div>
  </div>
);

const ReportsTab = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Sickness Benefit Reports</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Button variant="outline" className="h-auto p-4 justify-start">
        <div className="text-left">
          <p className="font-semibold">Claims by Employer</p>
          <p className="text-sm text-muted-foreground">Analyze sickness claims distribution</p>
        </div>
      </Button>
      <Button variant="outline" className="h-auto p-4 justify-start">
        <div className="text-left">
          <p className="font-semibold">Claims by Diagnosis</p>
          <p className="text-sm text-muted-foreground">Common illness patterns</p>
        </div>
      </Button>
      <Button variant="outline" className="h-auto p-4 justify-start">
        <div className="text-left">
          <p className="font-semibold">Claims by Period</p>
          <p className="text-sm text-muted-foreground">Seasonal trends analysis</p>
        </div>
      </Button>
      <Button variant="outline" className="h-auto p-4 justify-start">
        <div className="text-left">
          <p className="font-semibold">Payment Summary</p>
          <p className="text-sm text-muted-foreground">Total benefits paid</p>
        </div>
      </Button>
    </div>
  </div>
);

const SicknessBenefit = () => {
  const tabs = [
    { value: "overview", label: "Overview & Rules", content: <OverviewTab /> },
    { value: "applications", label: "Applications", content: <ApplicationsTab /> },
    { value: "eligibility", label: "Eligibility Rules", content: <EligibilityRulesTab /> },
    { value: "calculation", label: "Calculation Rules", content: <CalculationRulesTab /> },
    { value: "reports", label: "Reports", content: <ReportsTab /> }
  ];

  return <SharedBenefitLayout title="Sickness Benefit" tabs={tabs} />;
};

export default SicknessBenefit;
