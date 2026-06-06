/**
 * ScreenTemplatePreview — renders a live form preview for a screen template
 * from the Screen & Field Library, before it is assigned to a product version.
 * Synthesizes a minimal FormDefinition from in-memory template + fields and
 * runs it through the same ApplicationFormEngine used by intake/public.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Eye } from 'lucide-react';
import { ApplicationFormEngine } from '@/components/bn/forms/ApplicationFormEngine';
import type { FormChannel, FormFieldDef, FormSectionDef } from '@/services/bn/forms/sectionCatalogue';
import type { FormDefinition } from '@/services/bn/forms/formDefinitionService';
import type { SectionDef, AppChannel } from './ScreenBuilder';

const CHANNEL_TABS: { key: AppChannel; label: string; mapped: FormChannel }[] = [
  { key: 'PUBLIC_ONLINE', label: 'Public Online', mapped: 'PUBLIC' },
  { key: 'STAFF_OFFLINE', label: 'Staff Offline', mapped: 'INTERNAL' },
  { key: 'ASSISTED_COUNTER', label: 'Assisted Counter', mapped: 'ASSISTED_OFFLINE' },
  { key: 'BACK_OFFICE_ENTRY', label: 'Back Office Entry', mapped: 'INTERNAL' },
];

interface Props {
  templateCode: string;
  templateName: string;
  sections: SectionDef[];
  fields: any[]; // bn_field_metadata rows
}

export function ScreenTemplatePreview({ templateCode, templateName, sections, fields }: Props) {
  const [active, setActive] = useState<AppChannel>('STAFF_OFFLINE');

  const definition: FormDefinition | null = useMemo(() => {
    if (!sections.length) return null;
    const channelTab = CHANNEL_TABS.find(c => c.key === active)!;
    const channel = channelTab.mapped;

    // Filter sections visible for this builder channel
    const visibleSections: FormSectionDef[] = sections
      .filter(s => !s.visible_for_channels?.length || s.visible_for_channels.includes(active))
      .map((s, i) => ({
        section_code: s.code,
        title: s.label,
        visibleForChannels: ['INTERNAL', 'ASSISTED_OFFLINE', 'PUBLIC'],
        sort_order: s.sort_order ?? (i + 1) * 10,
      }));

    const visibleSectionCodes = new Set(visibleSections.map(s => s.section_code));

    const mappedFields: FormFieldDef[] = fields
      .filter(f => f.is_active !== false)
      .filter(f => visibleSectionCodes.has(f.section_code))
      .filter(f => {
        const ch: AppChannel[] | undefined = f.validation_rules?.visible_for_channels;
        return !ch?.length || ch.includes(active);
      })
      .map(f => ({
        field_code: f.field_code,
        field_label: f.field_label,
        field_type: (f.field_type || 'TEXT').toUpperCase() as any,
        section_code: f.section_code,
        is_required: !!f.is_required,
        visibleForChannels: ['INTERNAL', 'ASSISTED_OFFLINE', 'PUBLIC'],
        validation_rules: f.validation_rules ?? undefined,
        options_source: f.options_source ?? undefined,
        default_value: f.default_value ?? undefined,
        help_text: f.help_text ?? undefined,
        sort_order: f.sort_order ?? 0,
      }));

    return {
      productId: 'preview',
      productCode: templateCode || 'PREVIEW',
      productVersionId: 'preview',
      benefitKey: 'PREVIEW',
      channel,
      sections: visibleSections,
      fields: mappedFields,
      documents: [],
      workflow: { hasWorkflow: false },
    };
  }, [sections, fields, active, templateCode]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Eye className="h-4 w-4" /> Live Form Preview
        </CardTitle>
        <CardDescription className="text-xs">
          Renders “{templateName || templateCode}” through the same form engine used by staff intake and the public portal. Channel-specific visibility is applied from each field's settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={active} onValueChange={v => setActive(v as AppChannel)}>
          <TabsList>
            {CHANNEL_TABS.map(c => (
              <TabsTrigger key={c.key} value={c.key}>{c.label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={active} className="pt-4">
            {!definition || !definition.fields.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No fields visible for this channel. Add fields or enable this channel in field settings.
              </p>
            ) : (
              <div className="pointer-events-none opacity-95">
                <ApplicationFormEngine definition={definition} channel={definition.channel} readOnly />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
