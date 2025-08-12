import React from 'react';
import { BackButton, BackNavigation, Button } from '../ui';

const BackButtonExample: React.FC = () => {
  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">Back Button Examples</h1>
      
      {/* Simple Back Button */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Simple Back Button</h2>
        <div className="flex gap-4">
          <BackButton>Back</BackButton>
          <BackButton variant="outline">Back to Dashboard</BackButton>
          <BackButton to="/dashboard">Go to Dashboard</BackButton>
        </div>
      </div>

      {/* Back Navigation with Breadcrumbs */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Back Navigation with Breadcrumbs</h2>
        <BackNavigation
          backText="Back to Dashboard"
          breadcrumbs={[
            { label: 'Benefits Management' },
            { label: 'All Benefits', current: true }
          ]}
          rightContent={
            <Button variant="outline" size="sm">
              Main Menu
            </Button>
          }
        />
      </div>

      {/* Back Navigation with Custom Action */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Back Navigation with Custom Action</h2>
        <BackNavigation
          backText="Back to Compliance"
          breadcrumbs={[
            { label: 'Compliance & Audit' },
            { label: 'Audit Management', current: true }
          ]}
          onClick={() => console.log('Custom back action')}
        />
      </div>

      {/* Back Navigation with Clickable Breadcrumbs */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Back Navigation with Clickable Breadcrumbs</h2>
        <BackNavigation
          backText="Back to Profile"
          breadcrumbs={[
            { label: 'User Profile & Permissions', href: '/profile' },
            { label: 'Change Password', current: true }
          ]}
          rightContent={
            <Button size="sm">
              Update Password
            </Button>
          }
        />
      </div>
    </div>
  );
};

export default BackButtonExample;
