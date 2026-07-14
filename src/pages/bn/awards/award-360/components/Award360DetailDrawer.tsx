/**
 * BN-AWARD360-B1 — Award 360 detail drawer.
 * Standard slots: title, status, summary, related, timeline, audit, actions.
 */
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AwardStatusBadge } from './index';

export interface Award360DrawerSection {
  key: string;
  label: string;
  content: React.ReactNode;
}

export interface Award360DetailDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  subtitle?: string;
  status?: string | null;
  statusTone?: 'default' | 'warn' | 'breach';
  sections: Award360DrawerSection[];
  actions?: React.ReactNode;
}

export const Award360DetailDrawer: React.FC<Award360DetailDrawerProps> = ({
  open,
  onOpenChange,
  title,
  subtitle,
  status,
  statusTone,
  sections,
  actions,
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
      <SheetHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <SheetTitle>{title}</SheetTitle>
            {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
          </div>
          {status ? <AwardStatusBadge status={status} tone={statusTone} /> : null}
        </div>
      </SheetHeader>
      <div className="mt-4 space-y-5">
        {sections.map((s) => (
          <section key={s.key}>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {s.label}
            </div>
            <div className="rounded-md border bg-muted/20 p-3 text-sm">{s.content}</div>
          </section>
        ))}
        {actions ? <div className="flex flex-wrap gap-2 border-t pt-3">{actions}</div> : null}
      </div>
    </SheetContent>
  </Sheet>
);
