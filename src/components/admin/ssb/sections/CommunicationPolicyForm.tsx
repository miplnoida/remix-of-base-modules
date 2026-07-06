import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

const config: SectionConfig = {
  sectionKey: "communication",
  assetKey: "ssb.communication",
  table: "ssb_communication_policy",
  title: "Communication Policy",
  description: "Binds notification templates per channel per process. Template and channel are selected from canonical Communication Domain sources. Include DEFERRED in notes to mark a channel deferred for MVP.",
  scopeColumns: ["profile_id", "template_code", "channel"],
  fields: [
    {
      name: "template_code",
      label: "Template",
      type: "reference",
      required: true,
      source: { table: "core_template", valueColumn: "code", labelColumn: "name", filter: { is_active: true }, sourceBadge: "Notification Templates" },
    },
    {
      name: "channel",
      label: "Channel",
      type: "reference",
      required: true,
      source: { table: "ssp_communication_channel", valueColumn: "code", labelColumn: "name", filter: { is_active: true }, sourceBadge: "Communication Domain · Channel" },
    },
    { name: "is_active", label: "Active", type: "boolean" },
    { name: "notes", label: "Notes / deferred reason", type: "textarea", helpText: "Free text only — write DEFERRED here to mark this channel as deferred." },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    template_code: "",
    channel: "",
    is_active: true,
  }),
};

export default function CommunicationPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
