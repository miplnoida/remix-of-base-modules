import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Stepper, StepperStep } from '@/components/ui/stepper';
import { ERMasterFormData } from '@/types/employerRegistration';
import SuccessAnimation from '@/components/shared/SuccessAnimation';
import EntityOverviewStep from './EntityOverviewStep';
import BackgroundInfoStep from './BackgroundInfoStep';
import ContactReachStep from './ContactReachStep';
import TechFinanceStep from './TechFinanceStep';
import { toast } from 'sonner';

interface FormDetailTabProps {
  formData: ERMasterFormData;
  onChange: (field: keyof ERMasterFormData, value: any) => void;
  onSave: () => Promise<string | null>;
  isViewMode: boolean;
  isSaving: boolean;
}

const FORM_STEPS = [
  { id: 'entity', title: 'Entity Overview' },
  { id: 'background', title: 'Background Info' },
  { id: 'contact', title: 'Contact & Reach' },
  { id: 'tech', title: 'Tech & Finance Overview' },
];

// Validation for each step
const validateStep = (step: number, formData: ERMasterFormData): Record<string, string> => {
  const errors: Record<string, string> = {};

  switch (step) {
    case 0: // Entity Overview
      if (!formData.name?.trim()) {
        errors.name = 'Employer name is required';
      }
      if (!formData.email?.trim()) {
        errors.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Invalid email format';
      }
      if (!formData.hq_addr1?.trim()) {
        errors.hq_addr1 = 'HQ Address 1 is required';
      }
      if (!formData.maddr1?.trim()) {
        errors.maddr1 = 'Mailing Address 1 is required';
      }
      break;
    case 1: // Background Info
      // No required fields
      break;
    case 2: // Contact & Reach
      if (!formData.phone?.trim()) {
        errors.phone = 'Contact telephone is required';
      }
      if (!formData.village_code || formData.village_code === '000') {
        errors.village_code = 'Village is required';
      }
      if (!formData.activity_type?.trim()) {
        errors.activity_type = 'Activity type is required';
      }
      if (!formData.inspector_code || formData.inspector_code === 'UNK') {
        errors.inspector_code = 'Inspector code is required';
      }
      if (!formData.application_date) {
        errors.application_date = 'Application date is required';
      }
      break;
    case 3: // Tech & Finance
      // No required fields
      break;
  }

  return errors;
};

export default function FormDetailTab({ formData, onChange, onSave, isViewMode, isSaving }: FormDetailTabProps) {
  const [currentStep, setCurrentStep] = useState(0);
  // In view/edit mode with existing data, mark all steps as completed to allow navigation
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    // If we have a regno (existing record), allow navigating all steps
    if (formData.regno) {
      return [0, 1, 2, 3];
    }
    return [];
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showStepSuccess, setShowStepSuccess] = useState(false);
  const hasShownSuccessRef = useRef(false);

  const steps: StepperStep[] = FORM_STEPS.map((step, index) => ({
    id: step.id,
    title: step.title,
    status: completedSteps.includes(index) 
      ? 'completed' 
      : index === currentStep 
        ? 'current' 
        : 'upcoming',
  }));

  const handleStepClick = useCallback((stepIndex: number) => {
    // In view mode or edit mode, allow clicking on any step
    // In new mode, allow clicking on completed steps or the next step only
    if (isViewMode || stepIndex <= Math.max(...completedSteps, 0) + 1) {
      setCurrentStep(stepIndex);
      setErrors({});
    }
  }, [completedSteps, isViewMode]);

  const handleSaveAndContinue = useCallback(async () => {
    // Validate current step
    const stepErrors = validateStep(currentStep, formData);
    
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      toast.error('Please fix validation errors before continuing');
      return;
    }

    setErrors({});
    
    // Save to database
    const result = await onSave();
    
    if (result) {
      // Mark step as completed
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep]);
      }

      // Show success animation
      if (!hasShownSuccessRef.current) {
        hasShownSuccessRef.current = true;
        setShowStepSuccess(true);
      }

      // Move to next step after success animation
      if (currentStep < FORM_STEPS.length - 1) {
        setTimeout(() => {
          setCurrentStep(prev => prev + 1);
          hasShownSuccessRef.current = false;
        }, 1200);
      } else {
        toast.success('Form completed! You can now proceed to other tabs.');
      }
    }
  }, [currentStep, formData, onSave, completedSteps]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setErrors({});
    }
  }, [currentStep]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <EntityOverviewStep
            formData={formData}
            onChange={onChange}
            isViewMode={isViewMode}
            errors={errors}
          />
        );
      case 1:
        return (
          <BackgroundInfoStep
            formData={formData}
            onChange={onChange}
            isViewMode={isViewMode}
            errors={errors}
          />
        );
      case 2:
        return (
          <ContactReachStep
            formData={formData}
            onChange={onChange}
            isViewMode={isViewMode}
            errors={errors}
          />
        );
      case 3:
        return (
          <TechFinanceStep
            formData={formData}
            onChange={onChange}
            isViewMode={isViewMode}
            errors={errors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Stepper */}
      <div className="border rounded-lg p-4 bg-background">
        <Stepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Step Content */}
      <div className="border rounded-lg p-6 bg-background">
        {renderStepContent()}
        
        {/* Navigation Buttons */}
        {!isViewMode && (
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="border-0 border-l-2 border-l-[#0284C7] shadow-md"
            >
              Previous
            </Button>
            <Button
              onClick={handleSaveAndContinue}
              disabled={isSaving}
              className="border-r-4 border-r-[#33529C]"
            >
              {isSaving 
                ? 'Saving...' 
                : currentStep === FORM_STEPS.length - 1 
                  ? 'Save & Finish' 
                  : 'Save & Continue'}
            </Button>
          </div>
        )}
      </div>

      {/* Success Animation */}
      <SuccessAnimation
        show={showStepSuccess}
        onComplete={() => setShowStepSuccess(false)}
        message="Step saved successfully"
        duration={1000}
      />
    </div>
  );
}
