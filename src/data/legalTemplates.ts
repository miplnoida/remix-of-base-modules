// Official legal templates with merge fields
export interface LegalTemplate {
  id: string;
  name: string;
  type: string;
  category: "Notice" | "Summons" | "Order" | "Warrant" | "Writ" | "Letter";
  version: number;
  content: string;
  mergeFields: string[];
  status: "Draft" | "Published";
  publishedAt?: string;
  publishedBy?: string;
}

export const legalTemplates: LegalTemplate[] = [
  {
    id: "tmpl-1",
    name: "Legal Action Requisition",
    type: "Requisition",
    category: "Notice",
    version: 1,
    status: "Published",
    publishedAt: "2024-01-15",
    mergeFields: [
      "case.number",
      "case.title",
      "plaintiff.name",
      "defendant.name",
      "business.name",
      "address",
      "amountDue",
      "costs",
      "requestDate",
      "officer.name",
    ],
    content: `SOCIAL SECURITY BOARD
LEGAL ACTION REQUISITION

Case Number: {{case.number}}
Case Title: {{case.title}}

TO: Legal Officer
FROM: Compliance Department
DATE: {{requestDate}}

PARTIES:
Plaintiff: {{plaintiff.name}}
Defendant: {{defendant.name}} / {{business.name}}
Address: {{address}}

AMOUNT CLAIMED:
Principal Amount: {{amountDue}}
Costs: {{costs}}
Total: {{total}}

I hereby request that legal action be initiated against the above-named defendant for recovery of outstanding contributions.

_______________________________
{{officer.name}}
Compliance Officer`,
  },
  {
    id: "tmpl-2",
    name: "Summons to Appear (Form 37)",
    type: "Summons",
    category: "Summons",
    version: 1,
    status: "Published",
    publishedAt: "2024-01-15",
    mergeFields: [
      "case.number",
      "defendant.name",
      "business.name",
      "address",
      "amountDue",
      "costs",
      "hearing.date",
      "hearing.time",
      "hearing.venue",
      "issueDate",
      "magistrate.name",
    ],
    content: `MAGISTRATE'S COURT
SUMMONS TO APPEAR
(Form 37)

Case No: {{case.number}}
Date of Issue: {{issueDate}}

TO: {{defendant.name}}
    {{business.name}}
    {{address}}

You are hereby summoned to appear before the Magistrate's Court at {{hearing.venue}} on {{hearing.date}} at {{hearing.time}} to answer a claim by the Social Security Board for:

AMOUNT CLAIMED:
Principal: {{amountDue}}
Costs: {{costs}}
TOTAL: {{total}}

If you fail to appear, judgment may be entered against you in your absence.

Issued by:
{{magistrate.name}}
Magistrate`,
  },
  {
    id: "tmpl-3",
    name: "Judgment Summons (Form 40)",
    type: "Judgment Summons",
    category: "Summons",
    version: 1,
    status: "Published",
    publishedAt: "2024-01-15",
    mergeFields: [
      "case.number",
      "defendant.name",
      "address",
      "judgment.amount",
      "judgment.date",
      "hearing.date",
      "hearing.time",
      "hearing.venue",
      "issueDate",
      "magistrate.name",
    ],
    content: `MAGISTRATE'S COURT
JUDGMENT SUMMONS
(Form 40)

Case No: {{case.number}}
Date of Issue: {{issueDate}}

TO: {{defendant.name}}
    {{address}}

WHEREAS on {{judgment.date}} judgment was obtained against you in the sum of {{judgment.amount}};

AND WHEREAS you have failed to satisfy the said judgment;

YOU ARE HEREBY SUMMONED to appear before the Magistrate's Court at {{hearing.venue}} on {{hearing.date}} at {{hearing.time}} to show cause why you should not be committed to prison for contempt.

YOU MUST ATTEND. Failure to appear may result in a warrant being issued for your arrest.

Issued by:
{{magistrate.name}}
Magistrate`,
  },
  {
    id: "tmpl-4",
    name: "Warrant of Commitment (Form 41)",
    type: "Warrant of Commitment",
    category: "Warrant",
    version: 1,
    status: "Published",
    publishedAt: "2024-01-15",
    mergeFields: [
      "case.number",
      "defendant.name",
      "address",
      "judgment.amount",
      "commitmentDays",
      "issueDate",
      "magistrate.name",
    ],
    content: `MAGISTRATE'S COURT
WARRANT OF COMMITMENT
(Form 41)

Case No: {{case.number}}
Date of Issue: {{issueDate}}

TO: The Commissioner of Police and all Police Officers

WHEREAS {{defendant.name}} of {{address}} has failed to satisfy a judgment in the sum of {{judgment.amount}} and has failed to show sufficient cause;

YOU ARE HEREBY COMMANDED to arrest the said {{defendant.name}} and deliver them to the Officer in Charge of Her Majesty's Prison to be detained for a period of {{commitmentDays}} days or until the judgment debt is satisfied.

Issued by:
{{magistrate.name}}
Magistrate`,
  },
  {
    id: "tmpl-5",
    name: "Writ of Execution",
    type: "Writ of Execution",
    category: "Writ",
    version: 1,
    status: "Published",
    publishedAt: "2024-01-15",
    mergeFields: [
      "case.number",
      "defendant.name",
      "address",
      "judgment.amount",
      "costs",
      "issueDate",
      "registrar.name",
    ],
    content: `MAGISTRATE'S COURT
WRIT OF EXECUTION

Case No: {{case.number}}
Date of Issue: {{issueDate}}

TO: The Marshal

WHEREAS judgment was obtained against {{defendant.name}} of {{address}} for the sum of {{judgment.amount}} plus costs of {{costs}};

YOU ARE HEREBY COMMANDED to levy execution on the goods and chattels of the said {{defendant.name}} to satisfy the judgment debt, costs, and your fees.

Issued by:
{{registrar.name}}
Registrar`,
  },
  {
    id: "tmpl-6",
    name: "Decision Letter - Compliant",
    type: "Decision Letter",
    category: "Letter",
    version: 1,
    status: "Published",
    publishedAt: "2024-01-15",
    mergeFields: [
      "case.number",
      "defendant.name",
      "address",
      "amountPaid",
      "paymentDate",
      "closureDate",
      "officer.name",
    ],
    content: `SOCIAL SECURITY BOARD

Case No: {{case.number}}
Date: {{closureDate}}

{{defendant.name}}
{{address}}

Dear Sir/Madam,

RE: CASE CLOSURE - FULL COMPLIANCE

We are pleased to inform you that your case has been closed as you have satisfied the judgment debt.

Amount Paid: {{amountPaid}}
Payment Date: {{paymentDate}}

Thank you for your cooperation.

Yours faithfully,

{{officer.name}}
Legal Officer`,
  },
  {
    id: "tmpl-7",
    name: "Notice of Hearing",
    type: "Notice",
    category: "Notice",
    version: 1,
    status: "Published",
    publishedAt: "2024-01-15",
    mergeFields: [
      "case.number",
      "case.title",
      "defendant.name",
      "address",
      "hearing.type",
      "hearing.date",
      "hearing.time",
      "hearing.venue",
      "officer.name",
    ],
    content: `SOCIAL SECURITY BOARD
NOTICE OF HEARING

Case No: {{case.number}}
{{case.title}}

TO: {{defendant.name}}
    {{address}}

You are hereby notified that a {{hearing.type}} has been scheduled in the above matter.

DATE: {{hearing.date}}
TIME: {{hearing.time}}
VENUE: {{hearing.venue}}

Please bring all relevant documents and records. If you require an adjournment, you must submit a written request at least 48 hours in advance.

{{officer.name}}
Legal Officer
Social Security Board`,
  },
];

export const getMergeFieldValue = (
  field: string,
  data: Record<string, any>
): string => {
  const keys = field.split(".");
  let value: any = data;
  
  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return `{{${field}}}`;
    }
  }
  
  return String(value ?? `{{${field}}}`);
};

export const mergeTemplate = (
  template: LegalTemplate,
  data: Record<string, any>
): string => {
  let content = template.content;
  
  template.mergeFields.forEach((field) => {
    const value = getMergeFieldValue(field, data);
    const regex = new RegExp(`\\{\\{${field}\\}\\}`, "g");
    content = content.replace(regex, value);
  });
  
  // Calculate total if amountDue and costs exist
  if (data.amountDue && data.costs) {
    const total = (parseFloat(data.amountDue) + parseFloat(data.costs)).toFixed(2);
    content = content.replace(/\{\{total\}\}/g, total);
  }
  
  return content;
};
