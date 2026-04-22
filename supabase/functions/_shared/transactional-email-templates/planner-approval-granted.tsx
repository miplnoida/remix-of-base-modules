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
  fullyApproved?: boolean
  inboxUrl?: string
}

const PlannerApprovalGranted = ({
  recipientName, actionType, employerName, approverRole, fullyApproved, inboxUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Approval recorded for {actionType ?? 'planner action'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {fullyApproved ? 'Action fully approved' : 'Approval recorded'}
        </Heading>
        <Text style={text}>Hello {recipientName ?? 'there'},</Text>
        <Section style={card}>
          <Text style={row}><strong>Action:</strong> {actionType ?? '—'}</Text>
          <Text style={row}><strong>Employer:</strong> {employerName ?? '—'}</Text>
          {approverRole && <Text style={row}><strong>Approved by role:</strong> {approverRole}</Text>}
          <Text style={row}>
            <strong>Status:</strong>{' '}
            {fullyApproved
              ? 'All required approvals received. The action is now active in the planner.'
              : 'One of two required approvals received. Awaiting the other approver.'}
          </Text>
        </Section>
        {inboxUrl && (
          <Text style={text}>
            View in the <Link href={inboxUrl} style={link}>Approval Inbox</Link>.
          </Text>
        )}
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PlannerApprovalGranted,
  subject: (d: Record<string, any>) =>
    d.fullyApproved
      ? `Approved: ${d.actionType ?? 'planner action'}`
      : `Approval recorded: ${d.actionType ?? 'planner action'}`,
  displayName: 'Planner approval granted',
  previewData: {
    recipientName: 'John Inspector',
    actionType: 'Convert exception',
    employerName: 'Acme Ltd',
    approverRole: 'Zone Supervisor',
    fullyApproved: false,
    inboxUrl: 'https://example.com/inbox',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0 0 16px' }
const row = { fontSize: '14px', color: '#334155', margin: '4px 0' }
const card = { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px 20px', margin: '16px 0' }
const link = { color: '#2563eb', textDecoration: 'underline' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '8px 0 0' }
