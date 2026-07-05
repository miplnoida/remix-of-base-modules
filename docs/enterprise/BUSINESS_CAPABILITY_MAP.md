# Business Capability Map (Epic 0.36A.2)

**Status:** Architecture only. No implementation impact.

Hierarchical view of enterprise business capabilities. Level 1 = capability domain. Level 2 = capability. Level 3 = sub-capability (where meaningful).

```text
Enterprise
├── Identity & Access
│   ├── Identity Management
│   │   ├── Registration of Identity
│   │   ├── Credential Lifecycle
│   │   └── Identity Verification
│   └── Authorisation & Role Management
│       ├── Role Definition
│       ├── Role Assignment
│       └── Capability-scoped Permission Enforcement
│
├── Party & Subject Registration
│   ├── Person Registration
│   │   ├── Demographic Capture
│   │   ├── Identifier Assignment
│   │   ├── Contact & Address Management
│   │   └── Relationship Management (dependants, guardians)
│   ├── Employer Registration
│   │   ├── Legal Entity Capture
│   │   ├── Site & Branch Registration
│   │   └── Authorised Officer Binding
│   ├── Organisation Registration (non-employer)
│   └── Service Provider Registration
│       ├── Medical Provider
│       ├── Bank / Payment Provider
│       ├── External Counsel
│       └── Agent / Broker
│
├── Scheme & Coverage
│   ├── Scheme Administration
│   │   ├── Scheme Definition
│   │   ├── Scheme Versioning
│   │   └── Legal Binding
│   └── Coverage Administration
│       ├── Coverage Enrolment
│       ├── Coverage Transition
│       └── Coverage Termination
│
├── Contribution
│   ├── Contribution Registration
│   ├── Wage & Earnings Administration
│   ├── Contribution Assessment
│   │   ├── Period Assessment
│   │   └── Retro Assessment
│   └── Contribution Collection
│       ├── Receipt
│       ├── Allocation
│       └── Reconciliation
│
├── Benefit
│   ├── Benefit Product Administration
│   │   ├── Product Definition
│   │   ├── Version Management
│   │   ├── Rule Binding
│   │   ├── Formula Binding
│   │   ├── Document Binding
│   │   ├── Workflow Binding
│   │   └── Notification Binding
│   ├── Eligibility Determination
│   ├── Claim Administration
│   │   ├── Claim Intake
│   │   ├── Claim Validation
│   │   └── Claim Progression
│   ├── Medical Assessment
│   ├── Decision Management
│   ├── Award Administration
│   │   ├── Award Creation
│   │   ├── Schedule Generation
│   │   └── Award Adjustment
│   ├── Payment Administration
│   │   ├── Payment Instruction
│   │   ├── Channel Routing
│   │   └── Payment Confirmation
│   ├── Post-Payment Review
│   ├── Recovery Management
│   │   ├── Arrangement
│   │   ├── Offset
│   │   └── Legal Recovery
│   └── Appeals
│
├── Compliance & Enforcement
│   ├── Compliance Monitoring
│   ├── Investigation
│   ├── Case Management
│   └── Enforcement Action
│
├── Legal
│   ├── Legal Referral & Intake
│   ├── Judicial Process Management
│   │   ├── Court Operations
│   │   ├── Hearings
│   │   ├── Orders
│   │   ├── Appeals
│   │   └── Enforcement of Judgment
│   └── Legal Cost Recovery
│
├── Finance
│   ├── General Ledger & Accounting
│   ├── Reconciliation
│   ├── Disbursement Execution
│   ├── Receipts & Allocation
│   └── Financial Reporting
│
├── Reference & Master Data
│   ├── Reference Data Administration
│   ├── Legal Reference Administration
│   ├── Location & Geography Administration
│   ├── Payment Channel & Bank Administration
│   ├── Formula & Rule Library Administration
│   └── Document Type Master Administration
│
├── Workflow & Process Orchestration
│   ├── Workflow Management
│   ├── Task & Workbasket Management
│   └── SLA & Escalation Management
│
├── Communication & Documents
│   ├── Notification Management
│   ├── Document Management
│   ├── Correspondence & Template Management
│   └── Portal Interaction Management
│
└── Reporting, Analytics & Audit
    ├── Operational Reporting
    ├── Regulatory Reporting
    ├── Analytics & BI
    ├── Audit & Traceability
    └── Integration Management
```

## Reading rules

- Left of the map is closer to the foundation (Identity → Registration → Scheme). Right is closer to outcomes (Reporting, Audit).
- A capability at any level may only depend on capabilities to its left or above it. See `CAPABILITY_DEPENDENCY_GRAPH.md`.
- Applications (BN, C3, Employer, Compliance, Legal, Finance, Portals, Admin) are *not* on this map. They *implement* subsets of these capabilities and are catalogued in `APPLICATION_CAPABILITY_MATRIX.md`.
