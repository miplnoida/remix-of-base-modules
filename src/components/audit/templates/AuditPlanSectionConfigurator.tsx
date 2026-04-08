import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowUp,
  ArrowDown,
  GripVertical,
  FileText,
  Table2,
  LayoutTemplate,
  Lock,
  RotateCcw,
  BookOpen,
  FileBreak,
} from 'lucide-react';
import type { AuditPlanSection, SectionDisplayMode } from '@/lib/audit/auditPlanTemplateTypes';
import { normalizeSectionOrder, reorderSection, validateSectionConfig } from '@/lib/audit/auditPlanSectionEngine';

interface AuditPlanSectionConfiguratorProps {
  sections: AuditPlanSection[];
  onChange: (sections: AuditPlanSection[]) => void;
  onReset?: () => void;
}

const DISPLAY_MODE_ICONS: Record<SectionDisplayMode, React.ReactNode> = {
  narrative: <FileText className="h-3.5 w-3.5" />,
  table: <Table2 className="h-3.5 w-3.5" />,
  auto: <LayoutTemplate className="h-3.5 w-3.5" />,
};

const DISPLAY_MODE_LABELS: Record<SectionDisplayMode, string> = {
  narrative: 'Narrative',
  table: 'Table',
  auto: 'Auto',
};

export function AuditPlanSectionConfigurator({
  sections,
  onChange,
  onReset,
}: AuditPlanSectionConfiguratorProps) {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  const enabledCount = sections.filter((s) => s.enabled).length;
  const validation = validateSectionConfig(sections);

  const handleToggle = useCallback(
    (id: string, enabled: boolean) => {
      const section = sections.find((s) => s.id === id);
      if (section?.mandatory) return; // Cannot disable mandatory
      onChange(sections.map((s) => (s.id === id ? { ...s, enabled } : s)));
    },
    [sections, onChange]
  );

  const handleMove = useCallback(
    (id: string, direction: 'up' | 'down') => {
      onChange(reorderSection(sections, id, direction));
    },
    [sections, onChange]
  );

  const handleLabelChange = useCallback(
    (id: string, value: string) => {
      onChange(
        sections.map((s) =>
          s.id === id ? { ...s, labelOverride: value || undefined } : s
        )
      );
    },
    [sections, onChange]
  );

  const handleDisplayModeChange = useCallback(
    (id: string, mode: SectionDisplayMode) => {
      onChange(sections.map((s) => (s.id === id ? { ...s, displayMode: mode } : s)));
    },
    [sections, onChange]
  );

  const handleInTocChange = useCallback(
    (id: string, inToc: boolean) => {
      onChange(sections.map((s) => (s.id === id ? { ...s, inToc } : s)));
    },
    [sections, onChange]
  );

  const handleStartNewPageChange = useCallback(
    (id: string, startNewPage: boolean) => {
      onChange(sections.map((s) => (s.id === id ? { ...s, startNewPage } : s)));
    },
    [sections, onChange]
  );

  const handleNormalize = useCallback(() => {
    onChange(normalizeSectionOrder(sections));
  }, [sections, onChange]);

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Section Configuration</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {enabledCount} of {sections.length} sections enabled
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={handleNormalize} className="text-xs h-7">
              Re-number
            </Button>
            {onReset && (
              <Button variant="ghost" size="sm" onClick={onReset} className="text-xs h-7">
                <RotateCcw className="h-3 w-3 mr-1" /> Reset
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {/* Validation warnings */}
        {!validation.valid && (
          <div className="mb-3 p-2 rounded-md bg-destructive/10 border border-destructive/20">
            {validation.errors.map((e, i) => (
              <p key={i} className="text-xs text-destructive">{e}</p>
            ))}
          </div>
        )}
        {validation.warnings.length > 0 && (
          <div className="mb-3 p-2 rounded-md bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
            {validation.warnings.map((w, i) => (
              <p key={i} className="text-xs text-yellow-700 dark:text-yellow-400">{w}</p>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> TOC</span>
          <span className="flex items-center gap-1"><FileBreak className="h-3 w-3" /> New Page</span>
          <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Mandatory</span>
        </div>

        {/* Section list */}
        <div className="space-y-1">
          <TooltipProvider delayDuration={300}>
            {sorted.map((section, idx) => (
              <SectionRow
                key={section.id}
                section={section}
                index={idx}
                totalCount={sorted.length}
                onToggle={handleToggle}
                onMove={handleMove}
                onLabelChange={handleLabelChange}
                onDisplayModeChange={handleDisplayModeChange}
                onInTocChange={handleInTocChange}
                onStartNewPageChange={handleStartNewPageChange}
              />
            ))}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Individual Section Row ───

interface SectionRowProps {
  section: AuditPlanSection;
  index: number;
  totalCount: number;
  onToggle: (id: string, enabled: boolean) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onLabelChange: (id: string, value: string) => void;
  onDisplayModeChange: (id: string, mode: SectionDisplayMode) => void;
  onInTocChange: (id: string, inToc: boolean) => void;
  onStartNewPageChange: (id: string, startNewPage: boolean) => void;
}

function SectionRow({
  section,
  index,
  totalCount,
  onToggle,
  onMove,
  onLabelChange,
  onDisplayModeChange,
  onInTocChange,
  onStartNewPageChange,
}: SectionRowProps) {
  const isDisabled = !section.enabled;

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
        isDisabled
          ? 'bg-muted/30 border-border/50 opacity-60'
          : 'bg-background border-border hover:bg-muted/20'
      }`}
    >
      {/* Drag handle / order indicator */}
      <div className="flex items-center gap-0.5 shrink-0">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="text-[10px] font-mono text-muted-foreground w-5 text-center">
          {section.order}
        </span>
      </div>

      {/* Enable/disable toggle */}
      <Switch
        checked={section.enabled}
        onCheckedChange={(v) => onToggle(section.id, v)}
        disabled={section.mandatory}
        className="shrink-0"
      />

      {/* Label */}
      <div className="flex-1 min-w-0">
        <Input
          value={section.labelOverride ?? section.label}
          onChange={(e) => onLabelChange(section.id, e.target.value)}
          className="h-7 text-xs border-0 bg-transparent px-1 focus-visible:ring-1"
          placeholder={section.label}
        />
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1 shrink-0">
        {section.mandatory && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="h-5 px-1 text-[9px] gap-0.5">
                <Lock className="h-2.5 w-2.5" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top"><p className="text-xs">Mandatory — cannot be disabled</p></TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* TOC checkbox */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center shrink-0">
            <Checkbox
              checked={section.inToc}
              onCheckedChange={(v) => onInTocChange(section.id, !!v)}
              className="h-3.5 w-3.5"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top"><p className="text-xs">Include in Table of Contents</p></TooltipContent>
      </Tooltip>

      {/* New page checkbox */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center shrink-0">
            <Checkbox
              checked={section.startNewPage}
              onCheckedChange={(v) => onStartNewPageChange(section.id, !!v)}
              className="h-3.5 w-3.5"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top"><p className="text-xs">Start on new page</p></TooltipContent>
      </Tooltip>

      {/* Display mode */}
      <Select
        value={section.displayMode}
        onValueChange={(v) => onDisplayModeChange(section.id, v as SectionDisplayMode)}
      >
        <SelectTrigger className="h-7 w-[90px] text-[10px] shrink-0">
          <div className="flex items-center gap-1">
            {DISPLAY_MODE_ICONS[section.displayMode]}
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(DISPLAY_MODE_LABELS) as SectionDisplayMode[]).map((mode) => (
            <SelectItem key={mode} value={mode} className="text-xs">
              <div className="flex items-center gap-1.5">
                {DISPLAY_MODE_ICONS[mode]}
                {DISPLAY_MODE_LABELS[mode]}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reorder buttons */}
      <div className="flex flex-col shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4"
          disabled={index === 0}
          onClick={() => onMove(section.id, 'up')}
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4"
          disabled={index === totalCount - 1}
          onClick={() => onMove(section.id, 'down')}
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
