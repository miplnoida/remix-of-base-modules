import React, { useState } from 'react';
import { FileText, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
          Configure required documents, categories, and validation rules for each module.
        </p>
      </div>

      <Alert className="bg-muted/50 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>How it works:</strong> Select a module → create document categories → add documents to each category.
          Each document can have <strong>supportive documents</strong> (additional evidence) and <strong>alternate documents</strong> (substitutes).
          You can set whether <em>all</em> or <em>any one</em> supportive document is needed per main document.
        </AlertDescription>
      </Alert>

      <ModuleSelector value={selectedModuleId} onChange={setSelectedModuleId} />

      {selectedModuleId && <CategoryList moduleId={selectedModuleId} />}
    </div>
  );
};

export default DocumentConfigurationPage;
