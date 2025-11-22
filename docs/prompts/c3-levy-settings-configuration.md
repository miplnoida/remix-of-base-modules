# Build Configurable C3 Levy Settings Module

We are building a C3 Settings Configuration module for the Social Security system of St Kitts & Nevis.

We need to create a comprehensive Rule Engine for Housing & Social Development Levy (LVC/LVF) so that:

- All levy rates, calculation rules, and thresholds are configurable (not hardcoded)
- All levy penalty rules (LVF) are configurable with automatic calculation
- All exemption rules and caps are configurable
- The engine runs during C3 submission validation and posting
- All rules are versioned with effective dates for policy changes

We want this implemented as: **C3 Management → Settings → Levy Configuration**

---

## 1. High-Level Requirements

Create a **C3 Levy Configuration System** with:

### Configurable rules for:

1. **Levy Rate Structure**
   - Base levy percentage on wages
   - Employer vs employee portions
   - Wage brackets and tiered rates
   - Maximum wage caps for levy calculation
   - Minimum levy amounts

2. **Levy Calculation Rules**
   - Calculation method (percentage, flat, tiered)
   - Rounding rules
   - Inclusion/exclusion of overtime, bonuses, allowances
   - Treatment of partial weeks/months
   - Pro-rata calculation rules

3. **Levy Penalty Rules (LVF)**
   - Late submission penalty calculation
   - Late payment penalty calculation
   - Interest calculation on overdue levies
   - Grace period configuration
   - Penalty caps and minimums
   - Compound vs simple interest rules

4. **Exemption & Special Cases**
   - Employer size exemptions (e.g., <5 employees)
   - Industry sector exemptions
   - Temporary exemption programs
   - Government entity treatment
   - Non-profit organization rules

5. **Payment Head Mapping**
   - LVC → GL account mapping
   - LVF → GL account mapping
   - By employer category, zone, or other dimensions

6. **Integration Rules**
   - Auto-case creation triggers (Compliance module)
   - Validation rules during C3 submission
   - Posting rules to accounting
   - Arrears tracking and escalation

### Store rules in database tables with:
- Effective date ranges (EffectiveFrom/EffectiveTo)
- Policy versioning (only one active policy at a time)
- Full audit trail of all changes
- Role-based access control for policy editing

### Expose API for other modules:
- `CalculateLevyForC3Submission(c3LineItems[], asOfDate)`
- `CalculateLevyPenalties(employerId, period, submissionDate, paymentDate)`
- `ValidateLevyExemption(employerId, period)`
- `GetActiveLevyPolicy(asOfDate)`

### Integrate with:
- **C3 Submission Module** (validation and calculation during submission)
- **C3 Verification Queue** (validate levy calculations)
- **Compliance Module** (auto-create cases for levy non-compliance)
- **Finance Module** (post levy amounts to GL with correct payment heads)
- **Employer Registry** (check exemption status)

---

## 2. Configuration Structure (Rule Tables)

Design the levy engine using config tables. Suggested core tables:

### 2.1 LevyPolicyHeader

Master policy header with versioning.

**Fields:**
- `PolicyId` (PK)
- `PolicyVersion` (e.g., "v1.0", "v2.0")
- `PolicyName` (e.g., "2024 Levy Policy")
- `EffectiveFrom` (date)
- `EffectiveTo` (date, nullable)
- `IsActive` (boolean - only one can be active)
- `Description`
- `CreatedBy` (userId)
- `CreatedDate`
- `ActivatedBy` (userId, nullable)
- `ActivatedDate` (nullable)
- `DeactivatedBy` (userId, nullable)
- `DeactivatedDate` (nullable)
- `Notes`

### 2.2 LevyRateConfig

Defines levy rates and calculation structure.

**Fields:**
- `RateConfigId` (PK)
- `PolicyId` (FK to LevyPolicyHeader)
- `RateType` (enum: Percentage, FlatAmount, Tiered)
- `EmployerRatePercent` (e.g., 2.5)
- `EmployeeRatePercent` (e.g., 2.5)
- `TotalRatePercent` (computed: 5.0)
- `AppliesTo` (enum: RegularWages, AllWages, BaseWagesOnly)
- `IncludeOvertime` (boolean)
- `IncludeBonuses` (boolean)
- `IncludeAllowances` (boolean)
- `MaxWageCap` (nullable - max weekly/monthly wage for levy calculation)
- `MinLevyAmount` (nullable - minimum levy per employee per period)
- `RoundingRule` (enum: NoRounding, NearestCent, NearestDollar, RoundUp, RoundDown)
- `CalculationFormula` (text - stores formula expression)
- `Priority` (int - for tiered rules)
- `EffectiveFrom`
- `EffectiveTo`
- `Status` (Active/Inactive)

**Example Records:**
```
RateType: Percentage
EmployerRate: 2.5%
EmployeeRate: 2.5%
AppliesTo: RegularWages
IncludeOvertime: true
MaxWageCap: 5000 XCD/month
```

### 2.3 LevyPenaltyConfig

Defines penalty calculation rules for late submission and late payment.

**Fields:**
- `PenaltyConfigId` (PK)
- `PolicyId` (FK)
- `PenaltyType` (enum: LateSubmission, LatePayment, BothSubmissionAndPayment)
- `TriggerCondition` (enum: SubmissionAfterGracePeriod, PaymentNotReceivedByDueDate, C3NotSubmitted)
- `GracePeriodDays` (int - days after period-end before penalty starts)
- `PenaltyCalculationType` (enum: PercentageOfLevy, FlatAmount, PercentagePerMonth, CompoundInterest, SimpleInterest)
- `PenaltyRatePercent` (e.g., 5.0 = 5% penalty)
- `PenaltyFlatAmount` (nullable)
- `InterestRatePercent` (nullable - for interest calculations)
- `InterestFrequency` (enum: Daily, Monthly, Quarterly)
- `CompoundInterest` (boolean)
- `PenaltyCapPercent` (nullable - max penalty as % of original levy)
- `PenaltyCapAmount` (nullable - absolute max penalty)
- `MinPenaltyAmount` (nullable)
- `CalculationFormula` (text)
- `AppliesAfterNotices` (int - number of notices before penalty, nullable)
- `EffectiveFrom`
- `EffectiveTo`
- `Status`

**Example Records:**
```
PenaltyType: LateSubmission
GracePeriodDays: 7
PenaltyCalculationType: PercentageOfLevy
PenaltyRatePercent: 3.0%
PenaltyCapPercent: 50%
```

```
PenaltyType: LatePayment
PenaltyCalculationType: SimpleInterest
InterestRatePercent: 2.0%
InterestFrequency: Monthly
```

### 2.4 LevyExemptionConfig

Defines exemption rules by employer category, size, sector, or special programs.

**Fields:**
- `ExemptionConfigId` (PK)
- `PolicyId` (FK)
- `ExemptionType` (enum: EmployerSize, IndustrySector, GovernmentEntity, NonProfit, TemporaryProgram, SpecialCase)
- `ExemptionCode` (e.g., "SMALL_EMPLOYER", "GOV_ENTITY", "TEMP_COVID")
- `ExemptionName`
- `Description`
- `ExemptionCriteria` (JSON - flexible criteria storage)
  - Example: `{"MaxEmployees": 5}` for small employer
  - Example: `{"IndustryCodes": ["AGR", "FSH"]}` for sector
  - Example: `{"EmployerType": "GOVERNMENT"}` for gov entities
- `ExemptionScope` (enum: FullExemption, EmployerPortionOnly, EmployeePortionOnly, PartialRate)
- `PartialRatePercent` (nullable - if partial exemption)
- `RequiresApproval` (boolean)
- `ApprovalAuthority` (text - e.g., "Director", "Minister")
- `AutoExpiry` (boolean)
- `ExpiryDate` (nullable)
- `RenewalRequired` (boolean)
- `RenewalFrequencyMonths` (nullable)
- `EffectiveFrom`
- `EffectiveTo`
- `Status`

### 2.5 LevyPaymentHeadMapping

Maps levy components to GL accounts based on employer attributes.

**Fields:**
- `MappingId` (PK)
- `PolicyId` (FK)
- `LevyComponent` (enum: LVC_Employer, LVC_Employee, LVC_Total, LVF_Penalty, LVF_Interest)
- `EmployerCategory` (nullable - if mapping varies by employer type)
- `EmployerZone` (nullable - if mapping varies by zone)
- `GLAccountCode` (e.g., "4010-LVC-EMP", "4010-LVC-EE")
- `GLAccountName`
- `DebitAccount` (for receivables)
- `CreditAccount` (for revenue)
- `Priority` (int - for matching rules)
- `EffectiveFrom`
- `EffectiveTo`
- `Status`

**Example Records:**
```
LevyComponent: LVC_Employer
GLAccountCode: 4010-LVC-EMP
GLAccountName: "Levy Contributions - Employer Portion"
```

### 2.6 LevyValidationRule

Validation rules applied during C3 submission.

**Fields:**
- `ValidationRuleId` (PK)
- `PolicyId` (FK)
- `RuleCode` (e.g., "LEVY_RATE_CHECK", "LEVY_CAP_CHECK")
- `RuleName`
- `RuleType` (enum: Error, Warning, Information)
- `ValidationExpression` (text - formula or logic expression)
- `ErrorMessage` (template with placeholders)
- `AutoCorrect` (boolean - can system auto-correct?)
- `AutoCorrectFormula` (nullable)
- `BlockSubmission` (boolean - for Error types)
- `Priority`
- `EffectiveFrom`
- `EffectiveTo`
- `Status`

**Example Records:**
```
RuleCode: LEVY_RATE_CHECK
RuleName: "Verify Levy Rate Calculation"
RuleType: Error
ValidationExpression: "CalculatedLevy == (Wages * LevyRate)"
ErrorMessage: "Levy amount does not match expected calculation"
BlockSubmission: true
```

### 2.7 LevyComplianceTrigger

Defines when to auto-create Compliance cases for levy issues.

**Fields:**
- `TriggerId` (PK)
- `PolicyId` (FK)
- `TriggerEvent` (enum: LevyNotPaid, LevyUnderPaid, LevyOverdue30Days, LevyOverdue60Days, C3SubmittedNoLevyPayment)
- `TriggerCondition` (JSON - detailed conditions)
- `CaseTypeToCreate` (e.g., "LEVY_NON_PAYMENT", "LEVY_ARREARS")
- `CasePriority` (enum: Low, Medium, High, Critical)
- `AssignToRole` (e.g., "ComplianceInspector")
- `AutoAssignByZone` (boolean)
- `NotificationTemplate` (FK to notification templates)
- `EscalationRules` (JSON - escalation thresholds)
- `EffectiveFrom`
- `EffectiveTo`
- `Status`

**Example Records:**
```
TriggerEvent: LevyNotPaid
TriggerCondition: {"DaysOverdue": 30, "MinAmount": 100}
CaseTypeToCreate: LEVY_NON_PAYMENT
CasePriority: High
AutoAssignByZone: true
```

### 2.8 LevyArreasEscalationConfig

Defines thresholds and actions for levy arrears escalation.

**Fields:**
- `EscalationConfigId` (PK)
- `PolicyId` (FK)
- `ThresholdType` (enum: Amount, Age, Both)
- `ThresholdAmount` (nullable)
- `ThresholdDays` (nullable)
- `EscalationLevel` (int - 1, 2, 3)
- `ActionType` (enum: SendNotice, CreateCase, EscalateToLegal, SuspendEmployer, ApplyPenalty)
- `ActionDetails` (JSON)
- `NoticeTemplateId` (FK, nullable)
- `RequiresApproval` (boolean)
- `ApprovalRole`
- `AutoExecute` (boolean)
- `EffectiveFrom`
- `EffectiveTo`
- `Status`

---

## 3. Rule Engine Behaviour

### 3.1 Levy Calculation (during C3 submission)

**Function:**
```typescript
CalculateLevyForC3Submission(c3Submission, lineItems[], asOfDate)
```

**Steps:**

1. **Load Active Policy**
   - Get active `LevyPolicyHeader` for `asOfDate`
   - Load associated `LevyRateConfig`, `LevyExemptionConfig`, `LevyValidationRule`

2. **Check Exemption Status**
   - Query `LevyExemptionConfig` for employer
   - If exempt: return zero levy or partial rate
   - Log exemption applied

3. **Calculate Levy per Line Item (Employee)**
   - For each C3 line item (employee):
     - Extract wages: regular, overtime, bonuses based on `AppliesTo` config
     - Apply wage cap if configured (`MaxWageCap`)
     - Calculate employer portion: `wagesSubjectToLevy * EmployerRatePercent`
     - Calculate employee portion: `wagesSubjectToLevy * EmployeeRatePercent`
     - Apply rounding rule
     - Apply minimum levy if configured
     - Store: `LVC_Employer`, `LVC_Employee` per line

4. **Aggregate to C3 Total**
   - Sum all line items
   - Store: `TotalLVC_Employer`, `TotalLVC_Employee`, `TotalLVC`

5. **Validate Against Rules**
   - Run all active `LevyValidationRule` entries
   - Flag errors/warnings
   - If `BlockSubmission` rule fails, prevent C3 submission

6. **Return Result**
   - Calculated levy amounts per line and total
   - Validation messages
   - GL posting entries (via `LevyPaymentHeadMapping`)

### 3.2 Levy Penalty Calculation (post-submission)

**Function:**
```typescript
CalculateLevyPenalties(employerId, period, submissionDate, paymentDate, asOfDate)
```

**Steps:**

1. **Load Active Policy**
   - Get active penalty config for `asOfDate`

2. **Determine Late Submission Penalty**
   - Calculate days late: `submissionDate - (periodEndDate + GracePeriodDays)`
   - If `daysLate > 0`:
     - Apply `LateSubmission` penalty from config
     - Use `PenaltyCalculationType` and `PenaltyRatePercent`
     - Apply caps and minimums
     - Store: `LVF_LateSubmission`

3. **Determine Late Payment Penalty**
   - Calculate days overdue: `currentDate - paymentDueDate`
   - If `daysOverdue > 0` and payment not received:
     - Apply `LatePayment` penalty/interest from config
     - If compound interest: calculate period-over-period
     - If simple interest: calculate linear
     - Apply caps and minimums
     - Store: `LVF_LatePayment`

4. **Check Escalation Triggers**
   - Evaluate `LevyArreasEscalationConfig` thresholds
   - If threshold met: trigger escalation action
   - Create Compliance case if configured

5. **Return Result**
   - Breakdown: base levy due, penalties, interest, total owed
   - Escalation flags and recommended actions

### 3.3 Exemption Validation

**Function:**
```typescript
ValidateLevyExemption(employerId, period)
```

**Steps:**

1. **Load Employer Profile**
   - Get employer: size, industry, type, zone

2. **Check Active Exemptions**
   - Query `LevyExemptionConfig` matching employer attributes
   - Check effective dates
   - Check expiry dates for temporary exemptions
   - Verify approval status if required

3. **Return Exemption Status**
   - Exempt: Yes/No
   - Exemption type and scope
   - Partial rate if applicable
   - Expiry date if temporary

### 3.4 Monthly Scheduled Jobs

**Scheduled Tasks** (via Central Scheduler):

1. **Monthly Levy Penalty Calculation**
   - Run on 1st of each month
   - For all employers with outstanding levy arrears:
     - Call `CalculateLevyPenalties`
     - Update arrears ledger
     - Post penalty amounts to GL

2. **Levy Compliance Case Creation**
   - Run daily
   - Evaluate all `LevyComplianceTrigger` conditions
   - Create Compliance cases for employers meeting trigger criteria

3. **Exemption Expiry Check**
   - Run weekly
   - Identify exemptions expiring in next 30 days
   - Send renewal notices
   - Auto-expire if `AutoExpiry = true`

---

## 4. UI – C3 Management → Settings → Levy Configuration

Create admin UI under: **C3 Management → Settings → Levy Configuration**

### Sub-pages:

#### 4.1 Levy Policy Management
- List all levy policies (current, past, future)
- Show: PolicyVersion, EffectiveFrom, EffectiveTo, IsActive, CreatedBy, CreatedDate
- Actions:
  - **Create New Policy** (creates draft policy with copied rules from current)
  - **Edit Draft Policy** (only if not yet activated)
  - **Activate Policy** (sets as active, deactivates current, sets effective dates)
  - **View Policy History** (full audit trail)
  - **Clone Policy** (for creating new version)

#### 4.2 Levy Rate Configuration
- CRUD for `LevyRateConfig` within active/draft policy
- Form fields:
  - Rate Type (dropdown)
  - Employer Rate %, Employee Rate %
  - Applies To (wages selection)
  - Include overtime/bonuses/allowances (checkboxes)
  - Max wage cap
  - Min levy amount
  - Rounding rule (dropdown)
  - Calculation formula (text area with syntax highlighting)
  - Effective dates
- Visual preview: show sample calculation with test wages
- Validation: ensure rates are valid percentages

#### 4.3 Levy Penalty Configuration
- CRUD for `LevyPenaltyConfig`
- Form fields:
  - Penalty Type (dropdown)
  - Trigger Condition (dropdown with description)
  - Grace Period (days input)
  - Calculation Type (dropdown)
  - Penalty Rate % or Flat Amount
  - Interest Rate % (if applicable)
  - Interest Frequency (if applicable)
  - Compound Interest (toggle)
  - Penalty caps and minimums
  - Formula (text area)
  - Effective dates
- Sample penalty calculator: input test scenario, see penalty calculation

#### 4.4 Exemption Rules
- CRUD for `LevyExemptionConfig`
- Form fields:
  - Exemption Type (dropdown)
  - Exemption Code (unique identifier)
  - Name and Description
  - Criteria (dynamic JSON builder based on type)
    - For employer size: Max employees input
    - For sector: Industry code multi-select
    - For government: Employer type toggle
  - Exemption Scope (dropdown: full, employer-only, employee-only, partial)
  - Partial Rate % (if scope = partial)
  - Requires Approval (toggle)
  - Approval Authority (text)
  - Auto Expiry (toggle)
  - Expiry Date (date picker)
  - Renewal Required (toggle)
  - Renewal Frequency (months)
  - Effective dates
- Employer Exemption Search: view which employers currently have exemptions

#### 4.5 Payment Head Mapping
- CRUD for `LevyPaymentHeadMapping`
- Form fields:
  - Levy Component (dropdown: LVC_Employer, LVC_Employee, LVF_Penalty, etc.)
  - Employer Category (optional dropdown)
  - Employer Zone (optional dropdown)
  - GL Account Code (searchable dropdown from chart of accounts)
  - GL Account Name (auto-filled)
  - Debit Account, Credit Account
  - Priority (for rule matching)
  - Effective dates
- Test Mapping: input employer details, see which GL accounts apply

#### 4.6 Validation Rules
- CRUD for `LevyValidationRule`
- Form fields:
  - Rule Code (unique identifier)
  - Rule Name
  - Rule Type (Error/Warning/Info)
  - Validation Expression (formula builder or text area)
  - Error Message Template (with placeholder support)
  - Auto Correct (toggle)
  - Auto Correct Formula (if applicable)
  - Block Submission (toggle, only for Error type)
  - Priority
  - Effective dates
- Rule Tester: input sample C3 data, run validation, see results

#### 4.7 Compliance Triggers
- CRUD for `LevyComplianceTrigger`
- Form fields:
  - Trigger Event (dropdown with descriptions)
  - Trigger Condition (JSON builder)
    - Days overdue input
    - Minimum amount input
    - Other conditions based on event type
  - Case Type to Create (dropdown)
  - Case Priority (dropdown)
  - Assign To Role (dropdown)
  - Auto Assign by Zone (toggle)
  - Notification Template (dropdown)
  - Escalation Rules (JSON builder)
  - Effective dates
- Preview: see which employers would trigger today

#### 4.8 Arrears Escalation
- CRUD for `LevyArreasEscalationConfig`
- Form fields:
  - Threshold Type (dropdown: Amount, Age, Both)
  - Threshold Amount (currency input)
  - Threshold Days (number input)
  - Escalation Level (1, 2, 3)
  - Action Type (dropdown with descriptions)
  - Action Details (dynamic form based on action type)
  - Notice Template (if applicable)
  - Requires Approval (toggle)
  - Approval Role (if requires approval)
  - Auto Execute (toggle)
  - Effective dates
- Escalation Matrix View: table showing all levels and thresholds
- Current Employers in Escalation: list of employers at each level

---

## 5. Integration Points

### 5.1 C3 Submission Module
- **On C3 Line Item Entry:**
  - Auto-calculate levy per employee using `CalculateLevyForC3Submission`
  - Display calculated amounts (employer portion, employee portion)
  - Show validation messages inline

- **On C3 Submission:**
  - Validate entire C3 against `LevyValidationRule`
  - Block submission if any Error-level rule fails
  - Store calculated levy amounts with C3 record

### 5.2 C3 Verification Queue
- **During Verification:**
  - Show calculated levy vs manually entered levy (if any)
  - Flag discrepancies
  - Allow verifier to recalculate or override with approval

### 5.3 C3 Posting to GL
- **On Posting:**
  - Use `LevyPaymentHeadMapping` to determine GL accounts
  - Create journal entries:
    - Debit: Employer Receivable (LVC)
    - Credit: Levy Revenue - Employer Portion
    - Credit: Levy Revenue - Employee Portion
  - If payment received: create payment entry
  - If payment not received: create arrears record

### 5.4 Compliance Module
- **Automatic Case Creation:**
  - Central Scheduler runs daily job
  - Evaluates all `LevyComplianceTrigger` conditions
  - Creates pre-legal subcases for levy non-compliance
  - Assigns to inspector by zone

- **Levy Penalty Tracking:**
  - Compliance officers can view levy-specific arrears
  - Levy penalties (LVF) tracked separately from SSF penalties
  - Payment arrangements can include levy components

### 5.5 Finance Module - Arrears Ledger
- **Levy Arrears Tracking:**
  - Separate ledger entries for LVC and LVF
  - Monthly penalty calculation updates LVF balance
  - Aging buckets: 0-30, 31-60, 61-90, 90+ days

### 5.6 Employer Registry
- **Exemption Status Display:**
  - Show active levy exemptions on employer profile
  - Display exemption type, scope, expiry date
  - Alert when exemption expiring soon

### 5.7 Reports Module
- **New Levy Reports:**
  - Levy Collections by Period
  - Levy Arrears by Employer
  - Levy Penalty Assessment
  - Exemption Usage Report
  - Levy Compliance Status by Zone
  - Levy Revenue vs Forecast

---

## 6. Data Migration & Seeding

### Initial Policy Setup
When system first deployed:
1. Create initial `LevyPolicyHeader` (v1.0) with current effective date
2. Seed all configuration tables with current St. Kitts & Nevis levy rules:
   - Current rate: 5% total (2.5% employer, 2.5% employee)
   - Grace period: 7 days
   - Penalty rate: 3% per month
   - Max wage cap: as per current policy
   - Any existing exemptions

### Historical Data
- If migrating from legacy system:
  - Import historical levy submissions with calculated amounts
  - Import historical penalty assessments
  - Import existing arrears balances
  - Link to appropriate policy version

---

## 7. Testing & Validation

### Unit Tests
- Test levy calculation with various wage scenarios
- Test penalty calculation with different late periods
- Test exemption matching logic
- Test validation rule evaluation

### Integration Tests
- Full C3 submission flow with levy calculation
- Penalty posting to arrears ledger
- Compliance case creation triggers
- GL posting with payment head mapping

### User Acceptance Testing
- Policy admin can create and activate new policy
- C3 officer sees correct levy calculations during data entry
- Compliance officer sees auto-created levy cases
- Finance officer sees correct GL postings
- Reports show accurate levy data

---

## 8. Audit & Compliance

### Full Audit Trail Required For:
- All policy changes (who, when, what changed, old vs new values)
- All policy activations/deactivations
- All rate changes
- All exemption grants/revocals
- All penalty assessments
- All manual overrides or adjustments

### Compliance Reports:
- Policy Change History
- Active Exemptions Report
- Penalty Assessment Audit
- GL Reconciliation (levies collected vs posted)
- Employer Compliance Status

---

## 9. Security & Access Control

### Role-Based Permissions:

**Policy Administrator:**
- Create, edit, activate levy policies
- Configure all rule tables
- Grant exemptions requiring approval
- View all audit logs

**Finance Manager:**
- View all policies (read-only)
- Configure payment head mappings
- Approve exemptions (if configured)
- Run reports

**C3 Officer:**
- View active policy (read-only)
- Calculate levy during C3 entry (auto)
- Cannot override calculated amounts without approval

**Compliance Officer:**
- View active policy (read-only)
- View levy arrears and penalties
- Create payment arrangements including levy components

**System Administrator:**
- Full access to all configuration
- Can activate/deactivate policies
- Can override all business rules (with audit)

---

## 10. Implementation Notes

### Mock Data Initially
- Implement all tables with TypeScript types
- Create mock data services
- Build UI with mock data persistence
- Design for easy swap to real database later

### Versioning Architecture
- Only ONE policy can be `IsActive = true` at any time
- When activating new policy:
  - System automatically deactivates current policy (sets `EffectiveTo = today`)
  - New policy becomes active (sets `IsActive = true`, `EffectiveFrom = specified date`)
- All rules linked to policy via `PolicyId` FK
- Historical calculations always use policy active on `asOfDate`

### Formula Support
- Calculation formulas stored as text expressions
- Support variables: `Wages`, `LevyRate`, `DaysLate`, `BaseLevy`, etc.
- Support operators: `+`, `-`, `*`, `/`, `min()`, `max()`, `if()`
- Evaluate using safe expression parser (no eval())
- Provide formula builder UI with drag-drop variables

### Performance Considerations
- Index on `PolicyId`, `EffectiveFrom`, `EffectiveTo`, `IsActive`
- Cache active policy configuration in memory
- Batch penalty calculations for monthly runs
- Optimize C3 line item levy calculation for large submissions

---

## 11. Success Criteria

The levy configuration system is complete when:

1. ✅ Policy admin can configure all levy rates, penalties, exemptions without code changes
2. ✅ C3 submission automatically calculates correct levy amounts per active policy
3. ✅ Penalties automatically calculated monthly and posted to arrears
4. ✅ Compliance cases automatically created for levy non-payment
5. ✅ All levy amounts correctly posted to GL with right payment heads
6. ✅ Full audit trail of all policy changes maintained
7. ✅ Policy versioning works correctly (only one active at a time)
8. ✅ Exemptions properly applied and tracked
9. ✅ All validation rules enforced during C3 submission
10. ✅ Reports accurately reflect levy collections, arrears, and penalties

---

Use this prompt to implement the comprehensive C3 Levy Configuration system with all rules configurable and versioned, integrated with C3 submission, Compliance, and Finance modules.
