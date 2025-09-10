import React from 'react';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';

const BackButtonExample: React.FC = () => {
  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">Back Button Examples</h1>
      
      <Button 
        onClick={() => window.history.back()}
        variant="outline"
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Example Back Button Usage</h2>
        <p className="text-muted-foreground">This is a simple example of how to use back buttons in the application.</p>
      </div>
    </div>
  );
};

export default BackButtonExample;