import React from 'react';
import { IPListing } from '@/components/ip/IPListing';

const PendingReviewsPage = () => {
  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      <IPListing />
    </div>
  );
};

export default PendingReviewsPage;