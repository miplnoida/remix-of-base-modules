import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Send, Loader2, CheckCircle2, Lock, Edit } from 'lucide-react';
import { useIPRegistration } from '@/hooks/useIPRegistration';
import { useIPStatuses, getStatusDescription } from '@/hooks/useIPMasterLookups';
import { BasicDetailsTab } from './BasicDetailsTab';
import { AddressContactTab } from './AddressContactTab';
import { RelationsTab } from './RelationsTab';
import { EmploymentDetailsTab } from './EmploymentDetailsTab';
import { DependentsTab } from './DependentsTab';
import { NotesTab } from './NotesTab';
import { VerificationTab } from './VerificationTab';

export const IPRegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const ssnParam = searchParams.get('ssn');
  const modeParam = searchParams.get('mode') as 'create' | 'edit' | 'view' || 'create';
  
  // State to track if user switched from view to edit mode
  const [isInEditMode, setIsInEditMode] = useState(modeParam !== 'view');

  const { data: statuses = [] } = useIPStatuses();

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

  // View mode is based on URL param AND user toggle state
  const isViewMode = modeParam === 'view' && !isInEditMode;

  // Update URL when SSN is assigned
  useEffect(() => {
    if (formData.ssn && !ssnParam) {
      navigate(`/person/register?ssn=${formData.ssn}&mode=edit`, { replace: true });
    }
  }, [formData.ssn, ssnParam, navigate]);

  // Handle switching from View to Edit mode
  const handleSwitchToEditMode = () => {
    if (!isEditable) return; // Only allow if record is editable (status = 'Z')
    setIsInEditMode(true);
    // Update URL to reflect edit mode
    if (ssnParam) {
      setSearchParams({ ssn: ssnParam, mode: 'edit' });
    }
  };

  const handleSave = async () => {
    // Don't save in view mode
    if (isViewMode) return;
    
    if (currentTab === 'basic') {
      await saveBasicDetails();
    }
  };

  const handleSubmit = async () => {
    // Don't submit in view mode
    if (isViewMode) return;
    
    const success = await submitRegistration();
    if (success) {
      navigate('/person/directory');
    }
  };

  // Handle tab change - don't save in view mode
  const onTabChange = async (newTab: string) => {
    if (isViewMode) {
      // In view mode, just switch tabs without saving
      handleTabChange(newTab, true); // Pass skipSave flag
    } else {
      handleTabChange(newTab);
    }
  };

  // Get status description from ip_status table
  const statusDescription = getStatusDescription(formData.status, statuses);

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
              {isViewMode 
                ? `View Registration: ${formData.ssn}` 
                : isNewRecord 
                  ? 'New Insured Person Registration' 
                  : `Edit Registration: ${formData.ssn}`
              }
            </h1>
            <p className="text-sm text-muted-foreground">
              {isViewMode && 'View Mode - Read Only'}
              {!isViewMode && formData.status === 'Z' && 'Draft - Complete all sections and submit for verification'}
              {!isViewMode && formData.status === 'P' && 'Pending Verification - Record locked for editing'}
              {!isViewMode && formData.status === 'A' && 'Active - Record is active'}
              {!isViewMode && formData.status === 'V' && 'Verified - Record has been verified'}
            </p>
          </div>
        </div>

        {/* Status Badge and Edit Button */}
        <div className="flex items-center gap-3">
          {/* Edit button - Show in view mode only if record is editable */}
          {isViewMode && isEditable && (
            <Button variant="outline" onClick={handleSwitchToEditMode}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
            formData.status === 'Z' ? 'bg-yellow-100 text-yellow-800' :
            formData.status === 'P' ? 'bg-blue-100 text-blue-800' :
            formData.status === 'A' ? 'bg-green-100 text-green-800' :
            formData.status === 'V' ? 'bg-emerald-100 text-emerald-800' :
            formData.status === 'E' ? 'bg-purple-100 text-purple-800' :
            formData.status === 'C' ? 'bg-gray-100 text-gray-800' :
            formData.status === 'T' ? 'bg-red-100 text-red-800' :
            formData.status === 'I' ? 'bg-orange-100 text-orange-800' :
            formData.status === 'S' ? 'bg-amber-100 text-amber-800' :
            formData.status === 'D' ? 'bg-rose-100 text-rose-800' :
            'bg-muted text-muted-foreground'
          }`}>
            {(formData.status === 'P' || !isEditable) && <Lock className="h-3 w-3" />}
            {formData.status === 'A' && <CheckCircle2 className="h-3 w-3" />}
            {statusDescription}
          </span>
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

      {/* View Mode Warning */}
      {isViewMode && (
        <Alert className="bg-blue-50 border-blue-200">
          <Lock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            You are viewing this record in read-only mode.
            {isEditable && ' Click "Edit" to make changes.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Not Editable Warning */}
      {!isEditable && !isViewMode && (
        <Alert className="bg-amber-50 border-amber-200">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            This record has been submitted and is locked for editing. Contact a supervisor for modifications.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={onTabChange}>
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
            isEditable={isEditable && !isViewMode}
          />
        </TabsContent>

        <TabsContent value="address" className="mt-4">
          <AddressContactTab
            formData={formData}
            updateField={updateField}
            isEditable={isEditable && !isViewMode}
          />
        </TabsContent>

        <TabsContent value="relations" className="mt-4">
          <RelationsTab
            formData={formData}
            updateField={updateField}
            isEditable={isEditable && !isViewMode}
          />
        </TabsContent>

        <TabsContent value="employment" className="mt-4">
          <EmploymentDetailsTab
            formData={formData}
            updateField={updateField}
            isEditable={isEditable && !isViewMode}
          />
        </TabsContent>

        <TabsContent value="dependents" className="mt-4">
          <DependentsTab
            dependents={dependents}
            onAddDependent={addDependent}
            onDeleteDependent={deleteDependent}
            isEditable={isEditable && !isViewMode}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <NotesTab
            notes={notes}
            onAddNote={addNote}
            isEditable={isEditable && !isViewMode}
          />
        </TabsContent>

        <TabsContent value="verification" className="mt-4">
          <VerificationTab
            formData={formData}
            updateField={updateField}
            isEditable={isEditable && !isViewMode}
          />
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {isViewMode 
            ? `SSN: ${formData.ssn || ''} | Status: ${statusDescription}`
            : isNewRecord 
              ? 'Save Basic Details to enable other tabs and get a temporary SSN.'
              : `SSN: ${formData.ssn || ''} | Status: ${statusDescription}`
          }
        </div>
        <div className="flex gap-3">
          {/* Show Edit button in footer if in view mode and editable */}
          {isViewMode && isEditable && (
            <Button variant="outline" onClick={handleSwitchToEditMode}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {/* Only show action buttons if NOT in view mode and record is editable */}
          {!isViewMode && isEditable && (
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

      {/* Info Notice - Hidden in View Mode */}
      {!isViewMode && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-700">
            <strong>Workflow:</strong> New registrations start as Draft (Z). Upon submission, status changes to Pending (P) 
            and the record is locked for verification. After verification by a supervisor, status changes to Verified (V) 
            and a permanent SSN is assigned.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default IPRegistrationForm;
