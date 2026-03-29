import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Briefcase, Users, AlertTriangle, TrendingUp, CheckCircle2,
  ArrowRight
} from 'lucide-react';

export interface ReportTemplate {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  sections: string[];
  reportType: string;
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'engagement',
    label: 'Engagement Report',
    description: 'Full audit engagement report with findings, responses, recommendations, and sign-off. The standard output for individual audit assignments.',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    reportType: 'Engagement Report',
    sections: ['metadata', 'executive_summary', 'background', 'objective', 'scope', 'methodology', 'risk_overview', 'findings', 'responses', 'actions', 'conclusion', 'distribution', 'approval'],
  },
  {
    id: 'executive',
    label: 'Executive Summary',
    description: 'High-level summary for senior management covering key findings, risk overview, and overall assessment. Concise and decision-oriented.',
    icon: Briefcase,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    reportType: 'Executive Summary',
    sections: ['metadata', 'executive_summary', 'risk_overview', 'findings', 'conclusion', 'approval'],
  },
  {
    id: 'committee',
    label: 'Committee / Board Pack',
    description: 'Comprehensive reporting pack for audit committee and board review. Includes portfolio progress, risk heat maps, and accountability summaries.',
    icon: Users,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    reportType: 'Committee Pack',
    sections: ['metadata', 'executive_summary', 'risk_overview', 'portfolio', 'executive_dashboard', 'findings', 'actions', 'conclusion', 'approval'],
  },
  {
    id: 'findings',
    label: 'Findings & Actions',
    description: 'Consolidated register of all audit findings, management responses, and corrective action tracking. Ideal for follow-up monitoring.',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    reportType: 'Findings & Actions Report',
    sections: ['metadata', 'findings', 'responses', 'actions'],
  },
  {
    id: 'portfolio',
    label: 'Portfolio Performance',
    description: 'Audit plan execution analytics — coverage, completion rates, risk distribution, department performance, and resource utilization.',
    icon: TrendingUp,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    reportType: 'Portfolio Performance Report',
    sections: ['metadata', 'executive_summary', 'portfolio', 'executive_dashboard', 'conclusion'],
  },
  {
    id: 'followup',
    label: 'Follow-up Validation',
    description: 'Validate implementation status of agreed management actions. Tracks closure performance, overdue items, and repeat findings.',
    icon: CheckCircle2,
    color: 'text-teal-600',
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    reportType: 'Follow-up Validation Report',
    sections: ['metadata', 'executive_summary', 'actions', 'conclusion', 'approval'],
  },
];

interface AuditReportTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: ReportTemplate) => void;
}

export function AuditReportTemplateSelector({ open, onOpenChange, onSelect }: AuditReportTemplateSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Select Report Template</DialogTitle>
          <DialogDescription>
            Choose a template to define the structure and sections for your report.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {REPORT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="group flex flex-col text-left rounded-xl border-2 border-border p-5 transition-all hover:border-primary hover:shadow-md"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2.5 rounded-lg ${template.bg} shrink-0`}>
                  <template.icon className={`h-5 w-5 ${template.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm mb-0.5">{template.label}</h3>
                  <Badge variant="outline" className="text-[10px]">
                    {template.sections.length} sections
                  </Badge>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {template.description}
              </p>
              <div className="flex flex-wrap gap-1 mt-3">
                {template.sections.slice(0, 6).map((s) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                    {s.replace(/_/g, ' ')}
                  </span>
                ))}
                {template.sections.length > 6 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    +{template.sections.length - 6} more
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
