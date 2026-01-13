import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Send, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { useIPRegistration } from '@/hooks/useIPRegistration';
import { BasicDetailsTab } from './BasicDetailsTab';
import { AddressContactTab } from './AddressContactTab';
import { RelationsTab } from './RelationsTab';
import { EmploymentDetailsTab } from './EmploymentDetailsTab';
import { DependentsTab } from './DependentsTab';
import { NotesTab } from './NotesTab';
import { VerificationTab } from './VerificationTab';

export const IPRegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ssnParam = searchParams.get('ssn');
  const modeParam = searchParams.get('mode') as 'create' | 'edit' | 'view' || 'create';

  const {
    formData,
    updateField,
    dependents,
    notes,
    isNewRecord,
    isSaving,
    saveSuccessAnimation,
    currentTab,
    enabledTabs,
    isEditable,
    isLoading,
    saveBasicDetails,
    handleTabChange,
    submitRegistration,
    addDependent,
    deleteDependent,
    addNote,
  } = useIPRegistration({
    ssn: ssnParam || undefined,
    mode: ssnParam ? modeParam : 'create',
  });

  // Update URL when SSN is assigned
  useEffect(() => {
    if (formData.ssn && !ssnParam) {
      navigate(`/person/register?ssn=${formData.ssn}&mode=edit`, { replace: true });
    }
  }, [formData.ssn, ssnParam, navigate]);

  const handleSave = async () => {
    if (currentTab === 'basic') {
      await saveBasicDetails();
    }
  };

  const handleSubmit = async () => {
    const success = await submitRegistration();
    if (success) {
      navigate('/person/directory');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/person/directory')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNewRecord ? 'New Insured Person Registration' : `Edit Registration: ${formData.ssn}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formData.status === 'Z' && 'Draft - Complete all sections and submit for verification'}
              {formData.status === 'P' && 'Pending Verification - Record locked for editing'}
              {formData.status === 'A' && 'Approved - Record is active'}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {formData.status === 'Z' && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">Draft</span>
          )}
          {formData.status === 'P' && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1">
              <Lock className="h-3 w-3" /> Pending
            </span>
          )}
          {formData.status === 'A' && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Approved
            </span>
          )}
        </div>
      </div>

      {/* Save Success Animation */}
      {saveSuccessAnimation && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Changes saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Not Editable Warning */}
      {!isEditable && (
        <Alert className="bg-amber-50 border-amber-200">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            This record has been submitted and is locked for editing. Contact a supervisor for modifications.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="basic" disabled={!enabledTabs.includes('basic')}>
            Basic Details
          </TabsTrigger>
          <TabsTrigger value="address" disabled={!enabledTabs.includes('address')}>
            Address & Contact
          </TabsTrigger>
          <TabsTrigger value="relations" disabled={!enabledTabs.includes('relations')}>
            Relations
          </TabsTrigger>
          <TabsTrigger value="employment" disabled={!enabledTabs.includes('employment')}>
            Employment
          </TabsTrigger>
          <TabsTrigger value="dependents" disabled={!enabledTabs.includes('dependents')}>
            Dependents
          </TabsTrigger>
          <TabsTrigger value="notes" disabled={!enabledTabs.includes('notes')}>
            Notes
          </TabsTrigger>
          <TabsTrigger value="verification" disabled={!enabledTabs.includes('verification')}>
            Verification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4">
          <BasicDetailsTab
            formData={formData}
            updateField={updateField}
            isEditable={isEditable}
          />
        </TabsContent>

        <TabsContent value="address" className="mt-4">
          <AddressContactTab
            formData={formData}
            updateField={updateField}
            isEditable={isEditable}
          />
        </TabsContent>

        <TabsContent value="relations" className="mt-4">
          <RelationsTab
            formData={formData}
            updateField={updateField}
            isEditable={isEditable}
          />
        </TabsContent>

        <TabsContent value="employment" className="mt-4">
          <EmploymentDetailsTab
            formData={formData}
            updateField={updateField}
            isEditable={isEditable}
          />
        </TabsContent>

        <TabsContent value="dependents" className="mt-4">
          <DependentsTab
            dependents={dependents}
            onAddDependent={addDependent}
            onDeleteDependent={deleteDependent}
            isEditable={isEditable}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <NotesTab
            notes={notes}
            onAddNote={addNote}
            isEditable={isEditable}
          />
        </TabsContent>

        <TabsContent value="verification" className="mt-4">
          <VerificationTab
            formData={formData}
            updateField={updateField}
            isEditable={isEditable}
          />
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {isNewRecord 
            ? 'Save Basic Details to enable other tabs and get a temporary SSN.'
            : `SSN: ${formData.ssn} | Status: ${formData.status === 'Z' ? 'Draft' : formData.status === 'P' ? 'Pending' : 'Approved'}`
          }
        </div>
        <div className="flex gap-3">
          {isEditable && (
            <>
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving || (currentTab === 'basic' && (!formData.surname || !formData.firstname))}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
              {!isNewRecord && (
                <Button
                  onClick={handleSubmit}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit for Verification
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Info Notice */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-700">
          <strong>Workflow:</strong> New registrations start as Draft (Z). Upon submission, status changes to Pending (P) 
          and the record is locked for verification. After verification by a supervisor, status changes to Approved (A) 
          and a permanent SSN is assigned.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default IPRegistrationForm;
