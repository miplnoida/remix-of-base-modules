import { createContext, useContext, ReactNode } from "react";

export type LegalRole = "Clerk" | "LegalOfficer" | "Supervisor" | "FinanceOfficer" | "ReadOnly" | "Admin";

export type LegalGrant = 
  | "createCase"
  | "assign"
  | "changeStatus"
  | "publishOrder"
  | "manageTemplates"
  | "manageSLAs"
  | "viewPIIRedacted"
  | "financeReconcile";

const roleGrants: Record<LegalRole, LegalGrant[]> = {
  Clerk: ["createCase"],
  LegalOfficer: ["createCase", "assign", "changeStatus", "viewPIIRedacted"],
  Supervisor: ["createCase", "assign", "changeStatus", "publishOrder", "viewPIIRedacted"],
  FinanceOfficer: ["financeReconcile"],
  ReadOnly: [],
  Admin: [
    "createCase",
    "assign",
    "changeStatus",
    "publishOrder",
    "manageTemplates",
    "manageSLAs",
    "viewPIIRedacted",
    "financeReconcile"
  ]
};

interface LegalRoleContextType {
  role: LegalRole;
  hasGrant: (grant: LegalGrant) => boolean;
  hasAnyGrant: (grants: LegalGrant[]) => boolean;
}

const LegalRoleContext = createContext<LegalRoleContextType | undefined>(undefined);

export function LegalRoleProvider({ children, role = "LegalOfficer" }: { children: ReactNode; role?: LegalRole }) {
  const hasGrant = (grant: LegalGrant) => {
    return roleGrants[role]?.includes(grant) || false;
  };

  const hasAnyGrant = (grants: LegalGrant[]) => {
    return grants.some(g => hasGrant(g));
  };

  return (
    <LegalRoleContext.Provider value={{ role, hasGrant, hasAnyGrant }}>
      {children}
    </LegalRoleContext.Provider>
  );
}

export function useLegalRole() {
  const context = useContext(LegalRoleContext);
  if (!context) {
    throw new Error("useLegalRole must be used within LegalRoleProvider");
  }
  return context;
}
