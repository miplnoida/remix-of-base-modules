// Benefit Eligibility Service - Automated eligibility checking based on St. Kitts & Nevis rules

import { BenefitApplication } from './mockData/benefitApplications';
import { DEFAULT_ELIGIBILITY_RULES, EligibilityResult, EligibilityCheck } from '@/types/benefitsWorkflow';

export class BenefitEligibilityService {
  /**
   * Main eligibility check function
   * Returns comprehensive eligibility result with all checks
   */
  static checkEligibility(application: BenefitApplication): EligibilityResult {
    const checks: EligibilityCheck[] = [];
    const failureReasons: string[] = [];
    const warnings: string[] = [];

    // Get rules for this benefit type
    const rules = DEFAULT_ELIGIBILITY_RULES[application.benefitType];
    
    if (!rules) {
      return {
        eligible: false,
        failureReasons: [`No eligibility rules found for benefit type: ${application.benefitType}`],
        warnings: [],
        checks: [],
      };
    }

    // Age Check
    const ageCheck = this.checkAge(application, rules);
    checks.push(ageCheck);
    if (!ageCheck.passed) {
      failureReasons.push(ageCheck.reason!);
    }

    // Contribution Check
    const contributionCheck = this.checkContributions(application, rules);
    checks.push(contributionCheck);
    if (!contributionCheck.passed) {
      failureReasons.push(contributionCheck.reason!);
    }

    // Medical Check (if applicable)
    if (this.requiresMedicalCertification(application.benefitType)) {
      const medicalCheck = this.checkMedicalCertification(application);
      checks.push(medicalCheck);
      if (!medicalCheck.passed) {
        failureReasons.push(medicalCheck.reason!);
      }
    }

    // Employment Check (if applicable)
    if (this.requiresEmploymentVerification(application.benefitType)) {
      const employmentCheck = this.checkEmploymentVerification(application);
      checks.push(employmentCheck);
      if (!employmentCheck.passed) {
        failureReasons.push(employmentCheck.reason!);
      }
    }

    // Deadline Check (only if deadline rule exists)
    if (rules.claimDeadline) {
      const deadlineCheck = this.checkSubmissionDeadline(application, rules);
      checks.push(deadlineCheck);
      if (!deadlineCheck.passed) {
        warnings.push(deadlineCheck.reason!);
      }
    }

    return {
      eligible: failureReasons.length === 0,
      failureReasons,
      warnings,
      checks,
    };
  }

  /**
   * Age eligibility check
   */
  private static checkAge(application: BenefitApplication, rules: any): EligibilityCheck {
    const currentAge = application.dateOfBirth ? this.calculateAge(application.dateOfBirth) : 0;
    
    let passed = true;
    let reason = '';

    if (rules.ageMin !== undefined && currentAge < rules.ageMin) {
      passed = false;
      reason = `Claimant must be at least ${rules.ageMin} years old. Current age: ${currentAge}`;
    } else if (rules.ageMax !== undefined && currentAge > rules.ageMax) {
      passed = false;
      reason = `Claimant must be under ${rules.ageMax} years old. Current age: ${currentAge}`;
    } else if (rules.pensionableAge !== undefined && currentAge < rules.pensionableAge) {
      passed = false;
      reason = `Claimant must be at least ${rules.pensionableAge} years old for this benefit. Current age: ${currentAge}`;
    } else if (rules.ageRequirement !== undefined && currentAge < rules.ageRequirement) {
      passed = false;
      reason = `Claimant must be at least ${rules.ageRequirement} years old. Current age: ${currentAge}`;
    }

    return {
      id: `age-check-${application.id}`,
      claimId: application.id,
      checkDate: new Date().toISOString(),
      checkType: 'AGE',
      passed,
      reason,
      details: {
        required: rules.ageMin || rules.ageMax || rules.pensionableAge || rules.ageRequirement,
        actual: currentAge,
      },
    };
  }

  /**
   * Contribution eligibility check
   */
  private static checkContributions(application: BenefitApplication, rules: any): EligibilityCheck {
    const totalContributions = application.contributionWeeks || 0;
    const recentContributions = application.recentContributions || 0;
    
    let passed = true;
    let reason = '';

    // Check minimum total contributions
    if (rules.minContributions !== undefined && totalContributions < rules.minContributions) {
      passed = false;
      reason = `Minimum ${rules.minContributions} weeks of contributions required. Claimant has ${totalContributions} weeks.`;
    }

    // Check minimum paid contributions (for pensions)
    if (rules.minPaidContributions !== undefined && totalContributions < rules.minPaidContributions) {
      passed = false;
      reason = `Minimum ${rules.minPaidContributions} paid contributions required. Claimant has ${totalContributions} paid contributions.`;
    }

    // Check recent contributions (for short-term benefits)
    if (rules.recentContributions !== undefined && recentContributions < rules.recentContributions) {
      passed = false;
      reason = `Minimum ${rules.recentContributions} contributions in the last ${rules.recentPeriod || 13} weeks required. Claimant has ${recentContributions}.`;
    }

    // Special check for Age Grant (must be below pension threshold)
    if (rules.maxContributions !== undefined && totalContributions > rules.maxContributions) {
      passed = false;
      reason = `Claimant has ${totalContributions} contributions, which qualifies for Age Pension, not Age Grant. Maximum for grant is ${rules.maxContributions}.`;
    }

    return {
      id: `contribution-check-${application.id}`,
      claimId: application.id,
      checkDate: new Date().toISOString(),
      checkType: 'CONTRIBUTION',
      passed,
      reason,
      details: {
        required: {
          total: rules.minContributions,
          recent: rules.recentContributions,
          recentPeriod: rules.recentPeriod,
        },
        actual: {
          total: totalContributions,
          recent: recentContributions,
        },
      },
    };
  }

  /**
   * Medical certification check
   */
  private static checkMedicalCertification(application: BenefitApplication): EligibilityCheck {
    const hasMedicalCert = application.documents?.some(doc => 
      doc.type === 'MEDICAL_CERTIFICATE' || doc.type === 'DOCTOR_CERTIFICATE'
    );

    return {
      id: `medical-check-${application.id}`,
      claimId: application.id,
      checkDate: new Date().toISOString(),
      checkType: 'MEDICAL',
      passed: hasMedicalCert || false,
      reason: hasMedicalCert ? '' : 'Medical certificate required but not provided',
      details: {
        required: 'Medical Certificate',
        actual: hasMedicalCert ? 'Provided' : 'Not Provided',
      },
    };
  }

  /**
   * Employment verification check
   */
  private static checkEmploymentVerification(application: BenefitApplication): EligibilityCheck {
    const hasEmployerVerification = application.employerVerified || false;

    return {
      id: `employment-check-${application.id}`,
      claimId: application.id,
      checkDate: new Date().toISOString(),
      checkType: 'EMPLOYMENT',
      passed: hasEmployerVerification,
      reason: hasEmployerVerification ? '' : 'Employer verification required but not completed',
      details: {
        required: 'Employer Verification',
        actual: hasEmployerVerification ? 'Verified' : 'Not Verified',
      },
    };
  }

  /**
   * Submission deadline check
   */
  private static checkSubmissionDeadline(application: BenefitApplication, rules: any): EligibilityCheck {
    const submissionDate = new Date(application.applicationDate);
    const eventDate = new Date(application.lastDayWorked || application.injuryDate || application.expectedDeliveryDate || application.dateOfBirth);
    const deadlineMonths = rules.claimDeadline;
    
    const deadlineDate = new Date(eventDate);
    deadlineDate.setMonth(deadlineDate.getMonth() + deadlineMonths);
    
    const passed = submissionDate <= deadlineDate;

    return {
      id: `deadline-check-${application.id}`,
      claimId: application.id,
      checkDate: new Date().toISOString(),
      checkType: 'EMPLOYMENT',
      passed,
      reason: passed ? '' : `Claim submitted after ${deadlineMonths}-month deadline. May result in reduced or denied benefits.`,
      details: {
        required: `Within ${deadlineMonths} months of event`,
        actual: `Submitted ${this.monthsBetween(eventDate, submissionDate)} months after event`,
      },
    };
  }

  /**
   * Helper: Calculate age from date of birth
   */
  private static calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Helper: Calculate months between dates
   */
  private static monthsBetween(date1: Date, date2: Date): number {
    const months = (date2.getFullYear() - date1.getFullYear()) * 12;
    return months + date2.getMonth() - date1.getMonth();
  }

  /**
   * Check if benefit type requires medical certification
   */
  private static requiresMedicalCertification(benefitType: string): boolean {
    return ['SICKNESS', 'MATERNITY_ALLOWANCE', 'MATERNITY_GRANT', 'EMPLOYMENT_INJURY', 'INVALIDITY', 'INVALIDITY_ASSISTANCE'].includes(benefitType);
  }

  /**
   * Check if benefit type requires employment verification
   */
  private static requiresEmploymentVerification(benefitType: string): boolean {
    return ['SICKNESS', 'MATERNITY_ALLOWANCE', 'EMPLOYMENT_INJURY'].includes(benefitType);
  }

  /**
   * Generate non-eligibility letter
   */
  static generateNonEligibilityLetter(application: BenefitApplication, eligibilityResult: EligibilityResult): string {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    return `
ST. KITTS AND NEVIS SOCIAL SECURITY BOARD

NON-ELIGIBILITY NOTICE

Date: ${today}
Ref: ${application.applicationNumber}

Dear ${application.insuredPersonName},

RE: ${application.benefitType.replace(/_/g, ' ')} CLAIM - APPLICATION DENIED

We have reviewed your application for ${application.benefitType.replace(/_/g, ' ')} submitted on ${new Date(application.applicationDate).toLocaleDateString()}.

After careful evaluation against the eligibility criteria set forth in the Social Security Act, we regret to inform you that your application has been DISALLOWED for the following reason(s):

${eligibilityResult.failureReasons.map((reason, index) => `${index + 1}. ${reason}`).join('\n')}

${eligibilityResult.warnings.length > 0 ? `\nAdditional Concerns:\n${eligibilityResult.warnings.map((warning, index) => `${index + 1}. ${warning}`).join('\n')}` : ''}

DETAILED ELIGIBILITY CHECK RESULTS:
${eligibilityResult.checks.map(check => `
- ${check.checkType} Check: ${check.passed ? 'PASSED' : 'FAILED'}
  ${check.reason ? `Reason: ${check.reason}` : ''}
  Required: ${JSON.stringify(check.details.required)}
  Actual: ${JSON.stringify(check.details.actual)}
`).join('\n')}

RIGHT TO APPEAL:
If you believe this decision is incorrect, you have the right to appeal within 30 days of receiving this notice. Please submit your appeal in writing to:

Appeals Officer
St. Kitts and Nevis Social Security Board
Church Street, Basseterre
St. Kitts

For further information or assistance, please contact our office at (869) 465-2005 or visit us during business hours.

Yours sincerely,

_____________________
Benefits Officer
St. Kitts and Nevis Social Security Board
    `.trim();
  }
}
