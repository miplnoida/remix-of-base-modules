import { SsbPolicySectionShell, type SectionConfig } from "@/components/admin/ssb/SsbPolicySectionShell";

const CHANNELS = [
  { value: "LETTER", label: "Letter" },
  { value: "EMAIL",  label: "Email" },
  { value: "SMS",    label: "SMS" },
  { value: "PORTAL", label: "Portal" },
];

const config: SectionConfig = {
  sectionKey: "communication",
  assetKey: "ssb.communication",
  table: "ssb_communication_policy",
  title: "Communication Policy",
  description: "Binds notification templates per channel per process. Mark SMS as DEFERRED in notes if the SMS gateway is not procured yet — governance treats this as an explicit deferral, not a gap.",
  scopeColumns: ["profile_id", "template_code", "channel"],
  fields: [
    { name: "template_code", label: "Template code", type: "text", required: true, helpText: "core_template.code, e.g. SSB.KN.LETTER.WELCOME_MEMBER" },
    { name: "channel",       label: "Channel",       type: "select", options: CHANNELS, required: true },
    { name: "is_active",     label: "Active",        type: "boolean" },
    { name: "notes",         label: "Notes",         type: "textarea", helpText: "Include DEFERRED here to mark this channel as deferred for MVP" },
  ],
  newDraftDefaults: (profileId) => ({
    profile_id: profileId,
    template_code: "",
    channel: "LETTER",
    is_active: true,
  }),
};

export default function CommunicationPolicyForm() {
  return <SsbPolicySectionShell config={config} />;
}
