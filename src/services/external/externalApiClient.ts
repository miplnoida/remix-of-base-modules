/**
 * externalApiClient
 *
 * Single façade used by the public website + registration wizard.
 * Internally delegates to Supabase auth and to the existing
 * resolvePortalPersonas / getPortalFeatureConfig / auditPortalAction
 * modules so we don't fork data paths.
 */
import { supabase } from "@/integrations/supabase/client";
import { auditPortalAction } from "./auditPortalAction";
import { resolvePortalPersonas, type Persona } from "./portalPersonaService";
import { getPortalFeatureConfig } from "./portalFeatureConfigService";

const db = supabase as any;

export type AccountType = "claimant" | "employer" | "doctor" | "task";

export interface RegisterPayload {
  accountType: AccountType;
  email?: string;
  phone?: string;
  password: string;
  displayName: string;
  preferredLanguage?: string;
}

export interface LinkInsuredInput {
  ssn: string;
  dateOfBirth: string;
  extraField?: string;
}

const portalRoleFor = (t: AccountType) =>
  t === "employer" ? "EMPLOYER_USER"
  : t === "doctor" ? "MEDICAL_OFFICER"
  : "CLAIMANT";

export const externalApiClient = {
  async registerExternalUser(p: RegisterPayload) {
    const meta: Record<string, any> = {
      display_name: p.displayName,
      portal_role: portalRoleFor(p.accountType),
      account_type: p.accountType,
      preferred_language: p.preferredLanguage ?? "en",
      link_status: p.accountType === "employer" || p.accountType === "doctor"
        ? "PENDING_APPROVAL"
        : "ACTIVE",
    };
    const { data, error } = await supabase.auth.signUp({
      email: p.email ?? `${crypto.randomUUID()}@phone.local`,
      password: p.password,
      phone: p.phone,
      options: {
        emailRedirectTo: `${window.location.origin}/public/login`,
        data: meta,
      },
    });
    if (error) throw error;
    auditPortalAction("REGISTRATION_STARTED", {
      userId: data.user?.id ?? null,
      payload: { accountType: p.accountType, hasEmail: !!p.email, hasPhone: !!p.phone },
    });
    return data;
  },

  async verifyEmailOtp(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) throw error;
    auditPortalAction("EMAIL_VERIFIED", { userId: data.user?.id ?? null, payload: { email } });
    return data;
  },

  async verifyPhoneOtp(phone: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    if (error) throw error;
    auditPortalAction("PHONE_VERIFIED", { userId: data.user?.id ?? null, payload: { phone } });
    return data;
  },

  async linkInsuredPerson(userId: string, input: LinkInsuredInput) {
    const { data: candidates, error } = await db
      .from("ip_master")
      .select("ssn, surname, first_name, date_of_birth, mother_maiden_name")
      .eq("ssn", input.ssn)
      .limit(1);
    if (error) throw error;
    const match = (candidates ?? [])[0];
    const dobOk = match && match.date_of_birth &&
      new Date(match.date_of_birth).toISOString().slice(0, 10) === input.dateOfBirth;
    if (!match || !dobOk) {
      auditPortalAction("SSN_LINK_FAIL", { userId, targetSsn: input.ssn });
      return { matched: false as const };
    }
    const { error: upErr } = await db.from("external_user_person_link").upsert({
      user_id: userId,
      person_ssn: input.ssn,
      relationship: "SELF",
      status: "VERIFIED",
      verified_at: new Date().toISOString(),
    }, { onConflict: "user_id,person_ssn,relationship" });
    if (upErr) throw upErr;
    auditPortalAction("SSN_LINK_SUCCESS", { userId, targetSsn: input.ssn });
    return { matched: true as const, person: match };
  },

  async registerEmployerUser(userId: string, regno: string, role: string) {
    const { data: er } = await db.from("er_master").select("regno, name").eq("regno", regno).maybeSingle();
    if (!er) {
      auditPortalAction("EMPLOYER_LINK_FAIL", { userId, payload: { regno } });
      return { matched: false as const };
    }
    await supabase.auth.updateUser({
      data: { employer_regno: regno, employer_role: role, link_status: "PENDING_APPROVAL" },
    });
    auditPortalAction("EMPLOYER_LINK_REQUESTED", {
      userId, payload: { regno, role, employerName: er.name },
    });
    return { matched: true as const, employer: er };
  },

  async registerMedicalProviderUser(userId: string, licenseNo: string) {
    await supabase.auth.updateUser({
      data: { provider_license_no: licenseNo, link_status: "PENDING_APPROVAL" },
    });
    auditPortalAction("PROVIDER_LINK_REQUESTED", { userId, payload: { licenseNo } });
    return { matched: true as const };
  },

  async getPortalPersonas(userId: string): Promise<Persona[]> {
    const ctx = await resolvePortalPersonas(userId);
    return ctx?.personas ?? [];
  },

  async getPortalFeatureFlags() {
    return getPortalFeatureConfig();
  },

  async getDashboardSummary(userId: string) {
    const { data: claims } = await db
      .from("bn_claim")
      .select("id, status, claim_no, created_at")
      .eq("submitted_by_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    return { recentClaims: claims ?? [] };
  },

  async getAvailableServices(_userId: string) {
    const { data } = await db
      .from("bn_product")
      .select("product_code, name, short_description")
      .eq("is_active", true)
      .limit(20);
    return data ?? [];
  },
};
