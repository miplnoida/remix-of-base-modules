import { SharedBenefitLayout } from "../SharedBenefitLayout";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ApplicationFormDialog } from "@/components/nbenefit/ApplicationFormDialog";
import { useState } from "react";

const OverviewTab = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Maternity Benefit Overview</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Active Claims</p>
        <p className="text-2xl font-bold">342</p>
      </div>
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Pending Applications</p>
        <p className="text-2xl font-bold">28</p>
      </div>
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">Total Paid (XCD)</p>
        <p className="text-2xl font-bold">$289,450</p>
      </div>
    </div>
    <div className="prose max-w-none">
      <p>Maternity Benefit provides income support for insured women during pregnancy and after childbirth.</p>
      <h4>Key Rules:</h4>
      <ul>
        <li>Contribution requirement: Minimum 20 weeks in last 30 weeks</li>
        <li>Maternity Allowance: Up to 13 weeks</li>
        <li>Maternity Grant: One-time lump sum payment</li>
        <li>Rate: 65% of average weekly insurable earnings</li>
      </ul>
    </div>
  </div>
);

const ApplicationsTab = () => {
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Maternity Benefit Applications</h3>
        <Button onClick={() => setShowApplicationForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>
      
      <ApplicationFormDialog
        open={showApplicationForm}
        onOpenChange={setShowApplicationForm}
        benefitType="MATERNITY"
        title="New Maternity Benefit Application"
      />

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
          <p className="text-2xl font-bold mt-2">20</p>
        </div>
        <div className="border rounded-lg p-4">
          <label className="text-sm font-medium">Reference Period (weeks)</label>
          <p className="text-2xl font-bold mt-2">30</p>
        </div>
        <div className="border rounded-lg p-4">
          <label className="text-sm font-medium">Maximum Allowance Duration (weeks)</label>
          <p className="text-2xl font-bold mt-2">13</p>
        </div>
        <div className="border rounded-lg p-4">
          <label className="text-sm font-medium">Grant Eligibility</label>
          <p className="text-2xl font-bold mt-2">Yes</p>
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
        <label className="text-sm font-medium">Maternity Allowance Rate</label>
        <p className="text-xl font-bold mt-2">65% of Average Weekly Insurable Earnings</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <label className="text-sm font-medium">Minimum Weekly Allowance (XCD)</label>
          <p className="text-xl font-bold mt-2">$150.00</p>
        </div>
        <div className="border rounded-lg p-4">
          <label className="text-sm font-medium">Maximum Weekly Allowance (XCD)</label>
          <p className="text-xl font-bold mt-2">$500.00</p>
        </div>
      </div>
      <div className="border rounded-lg p-4">
        <label className="text-sm font-medium">Maternity Grant (XCD)</label>
        <p className="text-xl font-bold mt-2">$400.00 (Lump Sum)</p>
      </div>
      <Button>Edit Calculation Rules</Button>
    </div>
  </div>
);

const ReportsTab = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Maternity Benefit Reports</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Button variant="outline" className="h-auto p-4 justify-start">
        <div className="text-left">
          <p className="font-semibold">Claims by Age Group</p>
          <p className="text-sm text-muted-foreground">Maternal age distribution</p>
        </div>
      </Button>
      <Button variant="outline" className="h-auto p-4 justify-start">
        <div className="text-left">
          <p className="font-semibold">Claims by Parity</p>
          <p className="text-sm text-muted-foreground">First birth vs subsequent</p>
        </div>
      </Button>
      <Button variant="outline" className="h-auto p-4 justify-start">
        <div className="text-left">
          <p className="font-semibold">Allowance vs Grant</p>
          <p className="text-sm text-muted-foreground">Benefit type breakdown</p>
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

const MaternityBenefit = () => {
  const tabs = [
    { value: "overview", label: "Overview & Rules", content: <OverviewTab /> },
    { value: "applications", label: "Applications", content: <ApplicationsTab /> },
    { value: "eligibility", label: "Eligibility Rules", content: <EligibilityRulesTab /> },
    { value: "calculation", label: "Calculation Rules", content: <CalculationRulesTab /> },
    { value: "reports", label: "Reports", content: <ReportsTab /> }
  ];

  return <SharedBenefitLayout title="Maternity Benefit" tabs={tabs} />;
};

export default MaternityBenefit;
