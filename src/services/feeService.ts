// Central Fee Service for calculating and applying fees across all modules

import {
  FeeDefinition,
  FeeInstance,
  FeeCalculationContext,
  FeeCalculationResult,
  AppliedFeesResult,
  EventType,
  FeeInstanceStatus,
} from '@/types/feeConfiguration';

/**
 * Central Fee Service
 * Provides fee calculation and application logic for all modules
 */
export class FeeService {
  private feeDefinitions: FeeDefinition[] = [];

  constructor(feeDefinitions: FeeDefinition[]) {
    this.feeDefinitions = feeDefinitions;
  }

  /**
   * Get all fee definitions applicable to a module and event
   */
  getApplicableFees(
    moduleName: string,
    eventType: EventType,
    context: FeeCalculationContext
  ): FeeDefinition[] {
    const now = new Date();
    
    return this.feeDefinitions.filter(fee => {
      // Check if fee is active
      if (fee.status !== 'Active') return false;

      // Check effective dates
      const effectiveFrom = new Date(fee.effectiveFrom);
      const effectiveTo = fee.effectiveTo ? new Date(fee.effectiveTo) : null;
      
      if (effectiveFrom > now) return false;
      if (effectiveTo && effectiveTo < now) return false;

      // Check if module is applicable
      if (!fee.applicableModules.includes(moduleName)) return false;

      // Check if event matches
      if (fee.applicabilityRules?.events && 
          !fee.applicabilityRules.events.includes(eventType)) {
        return false;
      }

      // Check conditions
      if (fee.applicabilityRules?.conditions) {
        const conditionResults = fee.applicabilityRules.conditions.map(condition =>
          this.evaluateCondition(condition, context)
        );

        if (fee.applicabilityRules.requiresAll) {
          return conditionResults.every(result => result);
        } else {
          return conditionResults.some(result => result);
        }
      }

      return true;
    });
  }

  /**
   * Calculate fees without applying them
   */
  calculateFees(
    moduleName: string,
    eventType: EventType,
    context: FeeCalculationContext
  ): FeeCalculationResult[] {
    const applicableFees = this.getApplicableFees(moduleName, eventType, context);

    return applicableFees.map(fee => this.calculateSingleFee(fee, context));
  }

  /**
   * Apply fees - calculate and create FeeInstance records
   */
  async applyFees(
    moduleName: string,
    eventType: EventType,
    context: FeeCalculationContext,
    userId: string
  ): Promise<AppliedFeesResult> {
    const calculations = this.calculateFees(moduleName, eventType, context);
    const applicableCalculations = calculations.filter(calc => calc.applicable);

    const feeInstances: FeeInstance[] = [];
    const errors: string[] = [];

    for (const calc of applicableCalculations) {
      try {
        const instance = this.createFeeInstance(calc, context, moduleName, userId);
        feeInstances.push(instance);

        // TODO: Post to Finance if auto-post enabled
        // TODO: Trigger notifications
        // TODO: Log to audit trail
      } catch (error) {
        errors.push(`Failed to apply fee ${calc.feeDefinition.feeCode}: ${error}`);
      }
    }

    const totalAmount = feeInstances.reduce((sum, fee) => sum + fee.totalAmount, 0);

    return {
      feeInstances,
      totalAmount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get all fees for a specific entity
   */
  getFeesForEntity(
    contextEntityType: string,
    contextEntityId: string
  ): FeeInstance[] {
    // TODO: Fetch from database
    // For now, return mock data
    return [];
  }

  /**
   * Calculate a single fee
   */
  private calculateSingleFee(
    fee: FeeDefinition,
    context: FeeCalculationContext
  ): FeeCalculationResult {
    let baseAmount = 0;
    let calculatedAmount = 0;

    // Determine base amount based on baseType
    if (fee.feeType === 'Fixed') {
      calculatedAmount = fee.fixedAmount || 0;
      baseAmount = calculatedAmount;
    } else if (fee.feeType === 'Percentage' && fee.baseType && fee.percentageRate) {
      baseAmount = this.getBaseAmount(fee.baseType, context);
      calculatedAmount = baseAmount * (fee.percentageRate / 100);
    } else if (fee.feeType === 'Formula' && fee.formulaExpression) {
      baseAmount = this.getBaseAmount(fee.baseType || 'Custom', context);
      calculatedAmount = this.evaluateFormula(fee.formulaExpression, context);
    }

    // Apply min/max thresholds
    if (fee.minAmount && calculatedAmount < fee.minAmount) {
      calculatedAmount = fee.minAmount;
    }
    if (fee.maxAmount && calculatedAmount > fee.maxAmount) {
      calculatedAmount = fee.maxAmount;
    }

    // Calculate tax
    let taxAmount = 0;
    if (fee.isTaxApplicable && fee.taxCode) {
      // TODO: Look up tax rate from tax code
      const taxRate = 0.15; // Example: 15% VAT
      taxAmount = calculatedAmount * taxRate;
    }

    const totalAmount = calculatedAmount + taxAmount;

    return {
      feeDefinition: fee,
      baseAmount,
      calculatedAmount,
      taxAmount,
      totalAmount,
      applicable: true,
    };
  }

  /**
   * Get base amount for percentage/formula calculations
   */
  private getBaseAmount(baseType: string, context: FeeCalculationContext): number {
    switch (baseType) {
      case 'ArrearsAmount':
        return context.arrearsAmount || 0;
      case 'JudgmentAmount':
        return context.judgmentAmount || 0;
      case 'BenefitAmount':
        return context.benefitAmount || 0;
      case 'ContributionAmount':
        return context.contributionAmount || 0;
      case 'OutstandingBalance':
        return context.outstandingBalance || 0;
      default:
        return 0;
    }
  }

  /**
   * Evaluate a formula expression
   * For now, uses simple eval - in production, use a proper expression evaluator
   */
  private evaluateFormula(formula: string, context: FeeCalculationContext): number {
    try {
      // Replace context variables in formula
      let evaluableFormula = formula;
      Object.keys(context).forEach(key => {
        const value = context[key];
        if (typeof value === 'number') {
          evaluableFormula = evaluableFormula.replace(
            new RegExp(`\\b${key}\\b`, 'g'),
            value.toString()
          );
        }
      });

      // TODO: Use a safe expression evaluator library in production
      // For now, return 0 as placeholder
      return 0;
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return 0;
    }
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    condition: { field: string; operator: string; value: any },
    context: FeeCalculationContext
  ): boolean {
    const fieldValue = context[condition.field];

    switch (condition.operator) {
      case 'gt':
        return fieldValue > condition.value;
      case 'lt':
        return fieldValue < condition.value;
      case 'eq':
        return fieldValue === condition.value;
      case 'gte':
        return fieldValue >= condition.value;
      case 'lte':
        return fieldValue <= condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'notIn':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Create a FeeInstance from calculation result
   */
  private createFeeInstance(
    calculation: FeeCalculationResult,
    context: FeeCalculationContext,
    moduleName: string,
    userId: string
  ): FeeInstance {
    const fee = calculation.feeDefinition;

    // Determine context entity
    let contextEntityType = '';
    let contextEntityId = '';

    if (context.legalCaseId) {
      contextEntityType = 'LegalCase';
      contextEntityId = context.legalCaseId;
    } else if (context.subcaseId) {
      contextEntityType = 'Subcase';
      contextEntityId = context.subcaseId;
    } else if (context.complianceCaseId) {
      contextEntityType = 'ComplianceCase';
      contextEntityId = context.complianceCaseId;
    } else if (context.benefitClaimId) {
      contextEntityType = 'BenefitClaim';
      contextEntityId = context.benefitClaimId;
    } else if (context.employerId) {
      contextEntityType = 'Employer';
      contextEntityId = context.employerId;
    } else if (context.insuredPersonId) {
      contextEntityType = 'InsuredPerson';
      contextEntityId = context.insuredPersonId;
    }

    const instance: FeeInstance = {
      feeInstanceId: crypto.randomUUID(),
      feeId: fee.feeId,
      feeCode: fee.feeCode,
      moduleName,
      contextEntityType,
      contextEntityId,
      baseAmount: calculation.baseAmount,
      calculatedAmount: calculation.calculatedAmount,
      taxAmount: calculation.taxAmount,
      totalAmount: calculation.totalAmount,
      status: fee.requiresApproval ? 'Pending' : 'Applied',
      postedToFinance: false,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    return instance;
  }
}

/**
 * Singleton instance - will be initialized with fee definitions from backend
 */
let feeServiceInstance: FeeService | null = null;

export function initializeFeeService(feeDefinitions: FeeDefinition[]): FeeService {
  feeServiceInstance = new FeeService(feeDefinitions);
  return feeServiceInstance;
}

export function getFeeService(): FeeService {
  if (!feeServiceInstance) {
    throw new Error('FeeService not initialized. Call initializeFeeService first.');
  }
  return feeServiceInstance;
}
