import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CiviCore Compliance'

interface Props {
  approverName?: string
  requesterName?: string
  zoneName?: string
  employerName?: string
  actionType?: string
  reason?: string
  exceptionCategory?: string
  slaDeadline?: string
  approveUrl?: string
  rejectUrl?: string
  inboxUrl?: string
}

const PlannerApprovalRequest = ({
  approverName, requesterName, zoneName, employerName, actionType,
  reason, exceptionCategory, slaDeadline, approveUrl, rejectUrl, inboxUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Planner approval needed: {actionType ?? 'action'} for {employerName ?? 'employer'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Approval requested</Heading>
        <Text style={text}>
          Hello {approverName ?? 'Approver'}, a planner action requires your review.
        </Text>

        <Section style={card}>
          <Text style={row}><strong>Requester:</strong> {requesterName ?? '—'}</Text>
          <Text style={row}><strong>Zone:</strong> {zoneName ?? '—'}</Text>
          <Text style={row}><strong>Employer:</strong> {employerName ?? '—'}</Text>
          <Text style={row}><strong>Action:</strong> {actionType ?? '—'}</Text>
          {exceptionCategory && (
            <Text style={row}><strong>Exception type:</strong> {exceptionCategory}</Text>
          )}
          <Text style={row}><strong>Reason:</strong> {reason ?? '—'}</Text>
          {slaDeadline && (
            <Text style={row}><strong>Decide by:</strong> {slaDeadline}</Text>
          )}
        </Section>

        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          {approveUrl && (
            <Button href={approveUrl} style={btnApprove}>Approve</Button>
          )}
          {rejectUrl && (
            <Button href={rejectUrl} style={btnReject}>Reject</Button>
          )}
        </Section>

        {inboxUrl && (
          <Text style={text}>
            Or review in the <Link href={inboxUrl} style={link}>Approval Inbox</Link>.
          </Text>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          You received this because you are a designated approver for this zone.
          {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PlannerApprovalRequest,
  subject: (d: Record<string, any>) =>
    `Approval needed: ${d.actionType ?? 'planner action'} — ${d.employerName ?? ''}`.trim(),
  displayName: 'Planner approval request',
  previewData: {
    approverName: 'Jane Supervisor',
    requesterName: 'John Inspector',
    zoneName: 'Zone A',
    employerName: 'Acme Ltd',
    actionType: 'Convert exception',
    reason: 'High-risk indicator outside capacity',
    exceptionCategory: 'High-risk override',
    slaDeadline: '24 Apr 2026, 14:00',
    approveUrl: 'https://example.com/approve',
    rejectUrl: 'https://example.com/reject',
    inboxUrl: 'https://example.com/inbox',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0 0 16px' }
const row = { fontSize: '14px', color: '#334155', margin: '4px 0' }
const card = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px 20px', margin: '16px 0' }
const btnApprove = { backgroundColor: '#16a34a', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', marginRight: '12px' }
const btnReject = { backgroundColor: '#dc2626', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }
const link = { color: '#2563eb', textDecoration: 'underline' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '8px 0 0' }
