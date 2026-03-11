import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import ModuleSelector from '@/components/admin/document-configuration/ModuleSelector';
import CategoryList from '@/components/admin/document-configuration/CategoryList';

const DocumentConfigurationPage: React.FC = () => {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-7 w-7" />
          Document Configuration
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure required documents, categories, and rules for each module
        </p>
      </div>

      <ModuleSelector value={selectedModuleId} onChange={setSelectedModuleId} />

      {selectedModuleId && <CategoryList moduleId={selectedModuleId} />}
    </div>
  );
};

export default DocumentConfigurationPage;
