import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CiviCore Compliance'

interface Props {
  approverName?: string
  requesterName?: string
  employerName?: string
  actionType?: string
  hoursPending?: number
  approveUrl?: string
  rejectUrl?: string
  inboxUrl?: string
}

const PlannerApprovalEscalation = ({
  approverName, requesterName, employerName, actionType, hoursPending,
  approveUrl, rejectUrl, inboxUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>SLA breach: approval pending for {hoursPending ?? '24+'} hours</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚠ Approval overdue</Heading>
        <Text style={text}>
          Hello {approverName ?? 'Approver'}, a planner approval has been pending
          for {hoursPending ?? '24+'} hours and has now breached SLA.
        </Text>
        <Section style={card}>
          <Text style={row}><strong>Requester:</strong> {requesterName ?? '—'}</Text>
          <Text style={row}><strong>Employer:</strong> {employerName ?? '—'}</Text>
          <Text style={row}><strong>Action:</strong> {actionType ?? '—'}</Text>
          <Text style={row}><strong>Pending for:</strong> {hoursPending ?? '24+'} hours</Text>
        </Section>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          {approveUrl && <Button href={approveUrl} style={btnApprove}>Approve now</Button>}
          {rejectUrl && <Button href={rejectUrl} style={btnReject}>Reject</Button>}
        </Section>
        <Text style={text}>
          If no decision is recorded soon, this will be escalated to the next tier.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} — automated SLA reminder</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PlannerApprovalEscalation,
  subject: (d: Record<string, any>) =>
    `[SLA breach] Approval overdue: ${d.actionType ?? 'planner action'}`,
  displayName: 'Planner approval escalation',
  previewData: {
    approverName: 'Jane Supervisor',
    requesterName: 'John Inspector',
    employerName: 'Acme Ltd',
    actionType: 'Convert exception',
    hoursPending: 26,
    approveUrl: 'https://example.com/approve',
    rejectUrl: 'https://example.com/reject',
    inboxUrl: 'https://example.com/inbox',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#b45309', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0 0 16px' }
const row = { fontSize: '14px', color: '#334155', margin: '4px 0' }
const card = { backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px 20px', margin: '16px 0' }
const btnApprove = { backgroundColor: '#16a34a', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', marginRight: '12px' }
const btnReject = { backgroundColor: '#dc2626', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '8px 0 0' }
