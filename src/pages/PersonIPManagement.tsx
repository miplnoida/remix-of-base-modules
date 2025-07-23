import React from 'react';
import { IPListing } from '@/components/ip/IPListing';

const PersonIPManagement = () => {
  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header - IP Management */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">IP Management</h1>
        </div>
      </div>

      {/* IP Listing Content */}
      <IPListing />
    </div>
  );
};

export default PersonIPManagement;