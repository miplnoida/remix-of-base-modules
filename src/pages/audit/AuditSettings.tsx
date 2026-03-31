import React, { useState } from 'react';
import { Shield, Settings, ChevronRight } from 'lucide-react';
import { PageShell } from '@/components/common';
import { cn } from '@/lib/utils';

// Lazy load both sections to keep bundle efficient
const RiskSettings = React.lazy(() => import('./RiskSettings'));
const AuditConfig = React.lazy(() => import('./AuditConfig'));

const SECTIONS = [
  {
    key: 'risk',
    label: 'Risk Configuration',
    icon: Shield,
    description: 'Likelihood & impact scales, scoring formula, rating bands, department risk method, and preview',
  },
  {
    key: 'system',
    label: 'System Configuration',
    icon: Settings,
    description: 'Notifications, SLA, feature flags, reference settings, activity types, and planning engine',
  },
] as const;

type SectionKey = typeof SECTIONS[number]['key'];

export default function AuditSettings() {
  const [activeSection, setActiveSection] = useState<SectionKey>('risk');

  return (
    <PageShell
      title="Audit Settings"
      subtitle="Centralized configuration for the Internal Audit module"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Audit Settings' }]}
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left navigation */}
        <nav className="lg:w-64 shrink-0 space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.key;
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={cn(
                  'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
                  isActive
                    ? 'bg-primary/10 border border-primary/20 text-foreground'
                    : 'hover:bg-muted/50 text-muted-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', isActive ? 'text-primary' : '')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm font-medium', isActive ? 'text-foreground' : '')}>
                      {section.label}
                    </span>
                    <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isActive ? 'rotate-90 text-primary' : '')} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{section.description}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <React.Suspense fallback={<div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>}>
            {activeSection === 'risk' && <RiskSettings embedded />}
            {activeSection === 'system' && <AuditConfig embedded />}
          </React.Suspense>
        </div>
      </div>
    </PageShell>
  );
}
