// Legal module configuration and feature flags
export type DataMode = "legacy" | "mock";

export const legalConfig = {
  // Data mode: "legacy" uses API adapter, "mock" uses local state
  dataMode: (localStorage.getItem("legal_dataMode") || "mock") as DataMode,
  
  // Feature flags
  features: {
    eSign: true,
    documentSharing: true,
    statusWorkflow: true,
    templateMerge: true,
    slaTracking: true,
    auditLog: true,
  },
  
  // SLA defaults (days)
  slaDefaults: {
    Filed: 30,
    "Under Review": 14,
    "Hearing Scheduled": 7,
    "Decision Pending": 21,
  },
  
  // Session timeout (minutes)
  sessionTimeout: 30,
};

export const setDataMode = (mode: DataMode) => {
  localStorage.setItem("legal_dataMode", mode);
  window.location.reload();
};
