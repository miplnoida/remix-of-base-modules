import React from 'react';
import { cn } from '@/lib/utils';
import './stepper.css';

export interface StepperStep {
  id: string;
  title: string;
  icon?: React.ReactNode;
  status: 'completed' | 'current' | 'upcoming';
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  className
}) => {
  return (
    <div className={cn("w-full", className)}>
      <div className="stepper">
        {steps.map((step, index) => {
          const isActive = index <= currentStep;
          const stepNumber = index + 1;
          
          return (
            <div 
              key={step.id} 
              className={cn(
                "step",
                `step-${stepNumber}`,
                isActive && "active"
              )}
              onClick={() => onStepClick?.(index)}
              style={{ cursor: onStepClick ? 'pointer' : 'default' }}
            >
              <div className="circle">
                {isActive && index < currentStep ? (
                  // Checkmark SVG for completed steps
                  <svg width="10" height="10" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.94127 4.72888C2.88643 4.78405 2.81159 4.81483 2.73387 4.81483C2.65615 4.81483 2.58131 4.78405 2.52647 4.72888L0.87013 3.07226C0.698238 2.90037 0.698238 2.62163 0.87013 2.45007L1.07753 2.24261C1.24948 2.07072 1.52789 2.07072 1.69978 2.24261L2.73388 3.27676L5.52813 0.482435C5.70008 0.310543 5.97876 0.310543 6.15038 0.482435L6.35778 0.689889C6.52967 0.861781 6.52967 1.14047 6.35778 1.31208L2.94127 4.72888Z" fill="#33529C"/>
                  </svg>
                ) : isActive && index === currentStep ? (
                  // Circle dot for current step
                  <span className="circle-dot"></span>
                ) : (
                  // Step number for upcoming steps
                  stepNumber
                )}
              </div>
              <div className="label">{step.title}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Stepper;
