/**
 * Claim Workbench — Section 6: Benefit-Specific Detail
 * 
 * Source: bn_claim_detail.detail_json (JSONB)
 * Future: cl_detail_* typed tables per benefit type
 * 
 * Renders dynamic form fields based on product category.
 * Editable in DRAFT, SUBMITTED, INTAKE_REVIEW statuses.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Stethoscope } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';

interface BenefitDetailSectionProps {
  category: string;
  detailJson: Record<string, any> | null;
  isEditable: boolean;
  onDetailChange: (key: string, value: any) => void;
}

// Define fields per benefit category — maps to future cl_detail_* columns
const CATEGORY_FIELDS: Record<string, FieldDef[]> = {
  SHORT_TERM: [ // Sickness
    { key: 'incapacity_date', label: 'Incapacity Date', type: 'date', required: true },
    { key: 'expected_return_date', label: 'Expected Return Date', type: 'date', required: false },
    { key: 'diagnosis_code', label: 'Diagnosis Code', type: 'text', required: false },
    { key: 'doctor_name', label: 'Doctor Name', type: 'text', required: true },
    { key: 'doctor_registration', label: 'Doctor Reg. No', type: 'text', required: false },
    { key: 'hospital_name', label: 'Hospital/Clinic', type: 'text', required: false },
    { key: 'is_work_related', label: 'Work Related', type: 'checkbox', required: false },
    { key: 'employer_notified', label: 'Employer Notified', type: 'checkbox', required: false },
  ],
  LONG_TERM: [ // Age Pension
    { key: 'retirement_date', label: 'Retirement Date', type: 'date', required: true },
    { key: 'pension_type', label: 'Pension Type', type: 'text', required: true },
    { key: 'best_years_start', label: 'Best Years Start', type: 'number', required: false },
    { key: 'best_years_end', label: 'Best Years End', type: 'number', required: false },
    { key: 'total_contribution_weeks', label: 'Contribution Weeks', type: 'number', required: false },
  ],
  PENSION: [ // Pension
    { key: 'retirement_date', label: 'Retirement Date', type: 'date', required: true },
    { key: 'pension_type', label: 'Pension Type', type: 'text', required: true },
    { key: 'tier_applied', label: 'Tier', type: 'text', required: false },
    { key: 'total_contribution_weeks', label: 'Contribution Weeks', type: 'number', required: false },
  ],
  INJURY: [ // Employment Injury
    { key: 'injury_date', label: 'Injury Date', type: 'date', required: true },
    { key: 'injury_description', label: 'Injury Description', type: 'text', required: true },
    { key: 'injury_location', label: 'Injury Location', type: 'text', required: true },
    { key: 'body_part_affected', label: 'Body Part Affected', type: 'text', required: false },
    { key: 'disablement_percentage', label: 'Disablement %', type: 'number', required: false },
    { key: 'is_temporary', label: 'Temporary Disability', type: 'checkbox', required: false },
    { key: 'employer_report_date', label: 'Employer Report Date', type: 'date', required: false },
  ],
  GRANT: [ // Funeral Grant
    { key: 'deceased_ssn', label: 'Deceased SSN', type: 'text', required: true },
    { key: 'deceased_name', label: 'Deceased Name', type: 'text', required: true },
    { key: 'date_of_death', label: 'Date of Death', type: 'date', required: true },
    { key: 'relationship_to_claimant', label: 'Relationship', type: 'text', required: true },
    { key: 'funeral_date', label: 'Funeral Date', type: 'date', required: false },
    { key: 'funeral_home', label: 'Funeral Home', type: 'text', required: false },
    { key: 'is_employment_injury_death', label: 'EI-Related Death', type: 'checkbox', required: false },
  ],
  SURVIVOR: [ // Survivor Benefit
    { key: 'deceased_ssn', label: 'Deceased SSN', type: 'text', required: true },
    { key: 'deceased_name', label: 'Deceased Name', type: 'text', required: true },
    { key: 'date_of_death', label: 'Date of Death', type: 'date', required: true },
    { key: 'relationship', label: 'Relationship', type: 'text', required: true },
    { key: 'survivor_dob', label: 'Survivor DOB', type: 'date', required: false },
    { key: 'is_dependent_child', label: 'Dependent Child', type: 'checkbox', required: false },
    { key: 'school_name', label: 'School Name', type: 'text', required: false },
  ],
  NON_CONTRIBUTORY: [ // NCP
    { key: 'means_test_date', label: 'Means Test Date', type: 'date', required: true },
    { key: 'monthly_income', label: 'Monthly Income (EC$)', type: 'number', required: true },
    { key: 'income_threshold', label: 'Income Threshold (EC$)', type: 'number', required: false },
    { key: 'means_test_passed', label: 'Means Test Passed', type: 'checkbox', required: false },
    { key: 'living_arrangement', label: 'Living Arrangement', type: 'text', required: false },
    { key: 'other_pension_amount', label: 'Other Pension Amount', type: 'number', required: false },
  ],
  ASSISTANCE: [ // Same as NCP
    { key: 'means_test_date', label: 'Means Test Date', type: 'date', required: true },
    { key: 'monthly_income', label: 'Monthly Income (EC$)', type: 'number', required: true },
    { key: 'means_test_passed', label: 'Means Test Passed', type: 'checkbox', required: false },
  ],
};

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'checkbox';
  required: boolean;
}

export const BenefitDetailSection: React.FC<BenefitDetailSectionProps> = ({
  category, detailJson, isEditable, onDetailChange,
}) => {
  const fields = CATEGORY_FIELDS[category] || CATEGORY_FIELDS.SHORT_TERM || [];
  const data = detailJson || {};

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Stethoscope className="h-4 w-4" /> Benefit-Specific Details
          <span className="text-xs text-muted-foreground font-normal">({category})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No benefit-specific fields defined for this category.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields.map(field => (
              <div key={field.key} className={field.type === 'checkbox' ? 'flex items-center gap-2 pt-6' : ''}>
                {field.type === 'checkbox' ? (
                  <>
                    <Checkbox
                      id={field.key}
                      checked={!!data[field.key]}
                      onCheckedChange={v => isEditable && onDetailChange(field.key, v)}
                      disabled={!isEditable}
                    />
                    <Label htmlFor={field.key} className="text-sm">{field.label}</Label>
                  </>
                ) : (
                  <>
                    <Label className="text-xs text-muted-foreground">
                      {field.label}{field.required && <span className="text-destructive"> *</span>}
                    </Label>
                    {isEditable ? (
                      <Input
                        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                        value={data[field.key] ?? ''}
                        onChange={e => onDetailChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-foreground mt-1">
                        {field.type === 'date' && data[field.key]
                          ? formatDateForDisplay(data[field.key])
                          : data[field.key] ?? '—'}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
          Stored in: bn_claim_detail.detail_json • Future: cl_detail_{category.toLowerCase()}
        </p>
      </CardContent>
    </Card>
  );
};
