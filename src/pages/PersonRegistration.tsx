
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  UserPlus,
  ArrowLeft,
  Home
} from 'lucide-react';
import { AddIPForm } from '@/components/person/AddIPForm';

const PersonRegistration = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <UserPlus className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Insured Person</h1>
            <p className="text-gray-600">Complete registration form for new insured person</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Main Menu
        </Button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button 
          onClick={() => navigate('/')}
          className="hover:text-gray-700 transition-colors"
        >
          Dashboard
        </button>
        <span>/</span>
        <button 
          onClick={() => navigate('/person/directory')}
          className="hover:text-gray-700 transition-colors"
        >
          Insured Persons
        </button>
        <span>/</span>
        <span className="text-gray-900">Add New IP</span>
      </div>

      <AddIPForm />
    </div>
  );
};

export default PersonRegistration;
