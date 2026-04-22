import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CiviCore Compliance'

interface Props {
  recipientName?: string
  actionType?: string
  employerName?: string
  approverRole?: string
  rejectionReason?: string
  inboxUrl?: string
}

const PlannerApprovalRejected = ({
  recipientName, actionType, employerName, approverRole, rejectionReason, inboxUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Planner action rejected: {actionType ?? 'action'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Action rejected</Heading>
        <Text style={text}>Hello {recipientName ?? 'there'},</Text>
        <Section style={card}>
          <Text style={row}><strong>Action:</strong> {actionType ?? '—'}</Text>
          <Text style={row}><strong>Employer:</strong> {employerName ?? '—'}</Text>
          {approverRole && <Text style={row}><strong>Rejected by:</strong> {approverRole}</Text>}
          <Text style={row}><strong>Reason:</strong> {rejectionReason ?? 'No reason provided'}</Text>
        </Section>
        <Text style={text}>
          The action will not proceed. You may revise and resubmit if appropriate.
        </Text>
        {inboxUrl && (
          <Text style={text}>
            View details in the <Link href={inboxUrl} style={link}>Approval Inbox</Link>.
          </Text>
        )}
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PlannerApprovalRejected,
  subject: (d: Record<string, any>) =>
    `Rejected: ${d.actionType ?? 'planner action'} — ${d.employerName ?? ''}`.trim(),
  displayName: 'Planner approval rejected',
  previewData: {
    recipientName: 'John Inspector',
    actionType: 'Merge duplicate',
    employerName: 'Acme Ltd',
    approverRole: 'Compliance Head',
    rejectionReason: 'Insufficient justification — please attach supporting evidence.',
    inboxUrl: 'https://example.com/inbox',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#991b1b', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0 0 16px' }
const row = { fontSize: '14px', color: '#334155', margin: '4px 0' }
const card = { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px 20px', margin: '16px 0' }
const link = { color: '#2563eb', textDecoration: 'underline' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '8px 0 0' }
