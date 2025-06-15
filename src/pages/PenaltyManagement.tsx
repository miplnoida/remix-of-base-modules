
import React from 'react';
import { PenaltyManagementForm } from '@/components/compliance/PenaltyManagementForm';

const PenaltyManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Penalty Management</h1>
        <p className="text-gray-600">Issue and manage compliance penalties and fines</p>
      </div>

      <PenaltyManagementForm />
    </div>
  );
};

export default PenaltyManagement;
