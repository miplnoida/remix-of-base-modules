import { 
  Heart, 
  Activity, 
  Baby, 
  Cross, 
  Users, 
  UserX, 
  DollarSign,
  LifeBuoy,
  Settings,
  FileSearch,
  FileText,
  Calculator,
  Workflow
} from "lucide-react";

export const nbenefitMenuItems = [
  {
    title: "Central Benefits Registry",
    icon: Heart,
    subItems: [
      // Short-Term Benefits
      {
        title: "Short-Term Benefits",
        icon: Activity,
        subItems: [
          {
            title: "Sickness Benefit",
            icon: Activity,
            subItems: [
              {
                title: "Overview & Rules",
                url: "/nbenefit/short-term/sickness/overview",
                icon: FileText,
                requiresPermission: "benefits_management"
              },
              {
                title: "Applications",
                url: "/nbenefit/short-term/sickness/applications",
                icon: FileSearch,
                requiresPermission: "benefits_management"
              },
              {
                title: "Eligibility Rules",
                url: "/nbenefit/short-term/sickness/eligibility-rules",
                icon: Settings,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Calculation Rules",
                url: "/nbenefit/short-term/sickness/calculation-rules",
                icon: Calculator,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Reports",
                url: "/nbenefit/short-term/sickness/reports",
                icon: FileText,
                requiresPermission: "benefits_management"
              }
            ]
          },
          {
            title: "Employment Injury Benefit",
            icon: Cross,
            subItems: [
              {
                title: "Overview & Rules",
                url: "/nbenefit/short-term/employment-injury/overview",
                icon: FileText,
                requiresPermission: "benefits_management"
              },
              {
                title: "Applications",
                url: "/nbenefit/short-term/employment-injury/applications",
                icon: FileSearch,
                requiresPermission: "benefits_management"
              },
              {
                title: "Medical/Travel Expenses",
                url: "/nbenefit/short-term/employment-injury/medical-expenses",
                icon: DollarSign,
                requiresPermission: "benefits_management"
              },
              {
                title: "Disability Assessment",
                url: "/nbenefit/short-term/employment-injury/disability-assessment",
                icon: Activity,
                requiresPermission: "benefits_management"
              },
              {
                title: "Calculation Rules",
                url: "/nbenefit/short-term/employment-injury/calculation-rules",
                icon: Calculator,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Reports",
                url: "/nbenefit/short-term/employment-injury/reports",
                icon: FileText,
                requiresPermission: "benefits_management"
              }
            ]
          },
          {
            title: "Maternity Benefit",
            icon: Baby,
            subItems: [
              {
                title: "Overview & Rules",
                url: "/nbenefit/short-term/maternity/overview",
                icon: FileText,
                requiresPermission: "benefits_management"
              },
              {
                title: "Applications",
                url: "/nbenefit/short-term/maternity/applications",
                icon: FileSearch,
                requiresPermission: "benefits_management"
              },
              {
                title: "Eligibility Rules",
                url: "/nbenefit/short-term/maternity/eligibility-rules",
                icon: Settings,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Calculation Rules",
                url: "/nbenefit/short-term/maternity/calculation-rules",
                icon: Calculator,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Reports",
                url: "/nbenefit/short-term/maternity/reports",
                icon: FileText,
                requiresPermission: "benefits_management"
              }
            ]
          },
          {
            title: "Funeral Grant",
            icon: Cross,
            subItems: [
              {
                title: "Overview & Rules",
                url: "/nbenefit/short-term/funeral-grant/overview",
                icon: FileText,
                requiresPermission: "benefits_management"
              },
              {
                title: "Applications",
                url: "/nbenefit/short-term/funeral-grant/applications",
                icon: FileSearch,
                requiresPermission: "benefits_management"
              },
              {
                title: "Eligibility & Amount Rules",
                url: "/nbenefit/short-term/funeral-grant/rules",
                icon: Settings,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Reports",
                url: "/nbenefit/short-term/funeral-grant/reports",
                icon: FileText,
                requiresPermission: "benefits_management"
              }
            ]
          }
        ]
      },
      // Long-Term Benefits
      {
        title: "Long-Term Benefits",
        icon: Users,
        subItems: [
          {
            title: "Age Benefit",
            icon: Users,
            subItems: [
              {
                title: "Overview & Rules",
                url: "/nbenefit/long-term/age-benefit/overview",
                icon: FileText,
                requiresPermission: "benefits_management"
              },
              {
                title: "Applications",
                url: "/nbenefit/long-term/age-benefit/applications",
                icon: FileSearch,
                requiresPermission: "benefits_management"
              },
              {
                title: "Pension vs Grant Rules",
                url: "/nbenefit/long-term/age-benefit/pension-grant-rules",
                icon: Settings,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Calculation Rules",
                url: "/nbenefit/long-term/age-benefit/calculation-rules",
                icon: Calculator,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Reports",
                url: "/nbenefit/long-term/age-benefit/reports",
                icon: FileText,
                requiresPermission: "benefits_management"
              }
            ]
          },
          {
            title: "Invalidity Benefit",
            icon: UserX,
            subItems: [
              {
                title: "Overview & Rules",
                url: "/nbenefit/long-term/invalidity/overview",
                icon: FileText,
                requiresPermission: "benefits_management"
              },
              {
                title: "Applications",
                url: "/nbenefit/long-term/invalidity/applications",
                icon: FileSearch,
                requiresPermission: "benefits_management"
              },
              {
                title: "Medical Assessment",
                url: "/nbenefit/long-term/invalidity/medical-assessment",
                icon: Activity,
                requiresPermission: "benefits_management"
              },
              {
                title: "Eligibility Rules",
                url: "/nbenefit/long-term/invalidity/eligibility-rules",
                icon: Settings,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Calculation Rules",
                url: "/nbenefit/long-term/invalidity/calculation-rules",
                icon: Calculator,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Reports",
                url: "/nbenefit/long-term/invalidity/reports",
                icon: FileText,
                requiresPermission: "benefits_management"
              }
            ]
          },
          {
            title: "Assistance Benefit",
            icon: LifeBuoy,
            subItems: [
              {
                title: "Overview & Rules",
                url: "/nbenefit/long-term/assistance/overview",
                icon: FileText,
                requiresPermission: "benefits_management"
              },
              {
                title: "Applications",
                url: "/nbenefit/long-term/assistance/applications",
                icon: FileSearch,
                requiresPermission: "benefits_management"
              },
              {
                title: "Dependency Rules",
                url: "/nbenefit/long-term/assistance/dependency-rules",
                icon: Settings,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Calculation Rules",
                url: "/nbenefit/long-term/assistance/calculation-rules",
                icon: Calculator,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Reports",
                url: "/nbenefit/long-term/assistance/reports",
                icon: FileText,
                requiresPermission: "benefits_management"
              }
            ]
          },
          {
            title: "Survivors' Benefit",
            icon: Users,
            subItems: [
              {
                title: "Overview & Rules",
                url: "/nbenefit/long-term/survivors/overview",
                icon: FileText,
                requiresPermission: "benefits_management"
              },
              {
                title: "Applications",
                url: "/nbenefit/long-term/survivors/applications",
                icon: FileSearch,
                requiresPermission: "benefits_management"
              },
              {
                title: "Eligibility Rules",
                url: "/nbenefit/long-term/survivors/eligibility-rules",
                icon: Settings,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Dependants & Sharing Rules",
                url: "/nbenefit/long-term/survivors/dependants-rules",
                icon: Settings,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Reports",
                url: "/nbenefit/long-term/survivors/reports",
                icon: FileText,
                requiresPermission: "benefits_management"
              }
            ]
          }
        ]
      },
      // Non-Contributory Pensions
      {
        title: "Non-Contributory Pensions",
        icon: LifeBuoy,
        subItems: [
          {
            title: "Assistance Pension",
            icon: Users,
            subItems: [
              {
                title: "Overview & Rules",
                url: "/nbenefit/non-contributory/assistance-pension/overview",
                icon: FileText,
                requiresPermission: "benefits_management"
              },
              {
                title: "Applications",
                url: "/nbenefit/non-contributory/assistance-pension/applications",
                icon: FileSearch,
                requiresPermission: "benefits_management"
              },
              {
                title: "Means Test & Criteria",
                url: "/nbenefit/non-contributory/assistance-pension/means-test",
                icon: Settings,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Assessment Workflow",
                url: "/nbenefit/non-contributory/assistance-pension/assessment",
                icon: Workflow,
                requiresPermission: "benefits_management"
              },
              {
                title: "Reports",
                url: "/nbenefit/non-contributory/assistance-pension/reports",
                icon: FileText,
                requiresPermission: "benefits_management"
              }
            ]
          },
          {
            title: "Invalidity Assistance",
            icon: UserX,
            subItems: [
              {
                title: "Overview & Rules",
                url: "/nbenefit/non-contributory/invalidity-assistance/overview",
                icon: FileText,
                requiresPermission: "benefits_management"
              },
              {
                title: "Applications",
                url: "/nbenefit/non-contributory/invalidity-assistance/applications",
                icon: FileSearch,
                requiresPermission: "benefits_management"
              },
              {
                title: "Medical & Means Test",
                url: "/nbenefit/non-contributory/invalidity-assistance/medical-means-test",
                icon: Settings,
                requiresPermission: "benefits_configuration"
              },
              {
                title: "Assessment Workflow",
                url: "/nbenefit/non-contributory/invalidity-assistance/assessment",
                icon: Workflow,
                requiresPermission: "benefits_management"
              },
              {
                title: "Reports",
                url: "/nbenefit/non-contributory/invalidity-assistance/reports",
                icon: FileText,
                requiresPermission: "benefits_management"
              }
            ]
          }
        ]
      },
      // Shared Config & Tools
      {
        title: "Shared Config & Tools",
        icon: Settings,
        subItems: [
          {
            title: "Common Eligibility Rules",
            url: "/nbenefit/shared/common-eligibility-rules",
            icon: Settings,
            requiresPermission: "benefits_configuration"
          },
          {
            title: "Calculation Engines",
            url: "/nbenefit/shared/calculation-engines",
            icon: Calculator,
            requiresPermission: "benefits_configuration"
          },
          {
            title: "Document Templates & Forms",
            url: "/nbenefit/shared/document-templates",
            icon: FileText,
            requiresPermission: "benefits_configuration"
          },
          {
            title: "Benefit Application Workflows",
            url: "/nbenefit/shared/workflows",
            icon: Workflow,
            requiresPermission: "benefits_configuration"
          },
          {
            title: "Benefit Registry Search",
            url: "/nbenefit/shared/registry-search",
            icon: FileSearch,
            requiresPermission: "benefits_management"
          }
        ]
      }
    ]
  }
];
