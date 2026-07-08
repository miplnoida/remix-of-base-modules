/**
 * Organisation Management — In-app User Manual
 * Ordered table-of-contents. Single source of truth for the manual shell
 * navigation, prev/next links, and the Print/Export bundle.
 *
 * Documentation only — adding entries here does NOT change any feature,
 * route, or schema in the underlying Organisation Management module.
 */
export interface ManualEntry {
  slug: string;
  label: string;
  group: string;
}

export const MANUAL_ENTRIES: ManualEntry[] = [
  { slug: 'overview',                        label: 'Overview & Mental Model',                       group: 'Introduction' },
  { slug: 'configuration-order',             label: 'The Configuration Order (Golden Path)',         group: 'Introduction' },

  { slug: 'foundation-profile',              label: 'Organization Profile',                          group: 'Foundation' },
  { slug: 'foundation-locations',            label: 'Locations & Branches',                          group: 'Foundation' },
  { slug: 'foundation-departments',          label: 'Departments',                                   group: 'Foundation' },
  { slug: 'foundation-modules',              label: 'Module Ownership & Defaults',                   group: 'Foundation' },
  { slug: 'foundation-designations',         label: 'Designation & Approval Hierarchy',              group: 'Foundation' },

  { slug: 'assets-media',                    label: 'Media Library',                                 group: 'Brand Assets' },
  { slug: 'assets-letterheads',              label: 'Letterheads',                                   group: 'Brand Assets' },
  { slug: 'assets-signatures',               label: 'Signatures',                                    group: 'Brand Assets' },
  { slug: 'assets-headers-footers',          label: 'Headers / Footers',                             group: 'Brand Assets' },
  { slug: 'assets-disclaimers',              label: 'Disclaimers',                                   group: 'Brand Assets' },
  { slug: 'assets-portal-branding',          label: 'Portal Branding',                               group: 'Brand Assets' },
  { slug: 'assets-document-assets',          label: 'Document Assets',                               group: 'Brand Assets' },
  { slug: 'assets-categories',               label: 'Asset Categories',                              group: 'Brand Assets' },

  { slug: 'library-templates',               label: 'Document Templates',                            group: 'Communication Library' },
  { slug: 'library-notification-templates',  label: 'Notification Templates',                        group: 'Communication Library' },
  { slug: 'library-text-blocks',             label: 'Text Blocks',                                   group: 'Communication Library' },
  { slug: 'library-tokens',                  label: 'Tokens',                                        group: 'Communication Library' },
  { slug: 'library-categories',              label: 'Categories',                                    group: 'Communication Library' },
  { slug: 'library-channels',                label: 'Channels',                                      group: 'Communication Library' },
  { slug: 'library-languages',               label: 'Languages / Translations',                      group: 'Communication Library' },

  { slug: 'configuration-center',            label: 'Configuration Center',                          group: 'Configuration Center' },

  { slug: 'validation-health',               label: 'Health Dashboard',                              group: 'Validation & Impact' },
  { slug: 'validation-usage',                label: 'Usage Validation',                              group: 'Validation & Impact' },
  { slug: 'validation-impact',               label: 'Impact Analysis',                               group: 'Validation & Impact' },
  { slug: 'validation-broken',               label: 'Broken References',                             group: 'Validation & Impact' },

  { slug: 'consumption-guide',               label: 'How Business Modules Consume This',             group: 'Developer Guide' },
  { slug: 'business-event-registry',         label: 'Business Event Registry (reference)',           group: 'Developer Guide' },
  { slug: 'glossary-troubleshooting',        label: 'Glossary & Troubleshooting',                    group: 'Reference' },
];

export const MANUAL_GROUPS: string[] = Array.from(
  new Set(MANUAL_ENTRIES.map((e) => e.group)),
);

export function getManualEntry(slug: string): ManualEntry | undefined {
  return MANUAL_ENTRIES.find((e) => e.slug === slug);
}

export function getPrevNext(slug: string): { prev?: ManualEntry; next?: ManualEntry } {
  const i = MANUAL_ENTRIES.findIndex((e) => e.slug === slug);
  if (i < 0) return {};
  return { prev: MANUAL_ENTRIES[i - 1], next: MANUAL_ENTRIES[i + 1] };
}
