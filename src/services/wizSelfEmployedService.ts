/**
 * Self-Employed Management API service
 * Calls the wiz-admin-api edge function for SE-related actions.
 *
 * Credentials & base URL are resolved via wizApiConfig (DB-driven, env-aware,
 * with fallback to legacy hardcoded values for zero-downtime cutover).
 */

import { getWizAdminConfig } from "@/lib/wizApiConfig";

interface WizApiResponse<T = any> {
  status: "success" | "error";
  data?: T;
  error?: string;
  total_records?: number;
}

async function callWizApi<T = any>(action: string, params: Record<string, any> = {}): Promise<WizApiResponse<T>> {
  const { baseUrl, apiKey } = await getWizAdminConfig();
  const res = await fetch(`${baseUrl}/wiz-admin-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-api-key": apiKey,
    },
    body: JSON.stringify({ action, params }),
  });
  const json = await res.json();
  if (!res.ok || json.status === "error") {
    throw new Error(json.error || `API error: ${res.status}`);
  }
  return json;
}

// ─── Types ────────────────────────────────────────────

export interface WizSelfEmployedRecord {
  employeeID: number;
  socSecNum: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string | null;
  phone: string | null;
  insertedOn: string;
  isActive: boolean;
  userId: number;
  occupation: string | null;
  tin: string | null;
}

export interface WizSelfEmployedDetails {
  employeeId: number;
  socSecNum: string;
  tin: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  birthDate: string | null;
  rblgender: boolean | null;
  maritalStat: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  mobile: string | null;
  email: string;
  occupation: string | null;
  category_Type: number | null;
  categoryDescription: string | null;
  regDate: string | null;
  loginId: string | null;
  question1: string | null;
  question2: string | null;
  answer1: string | null;
  answer2: string | null;
  userId: number;
  isActive: boolean;
}

export interface WizSelfEmployedUser {
  userId: number;
  firstName: string;
  lastName: string;
  emailId: string;
  profileImage: string | null;
  selfEmployedId: number;
}

export interface WizWageCategory {
  categoryID: number;
  categoryDescription: string;
  categoryCode: string;
  minWage: number;
  maxWage: number;
  weeklyIncome: number;
  weeklyContribution: number;
}

export interface WizCountry {
  conId: number;
  name: string;
  code: string;
}

// ─── API Functions ────────────────────────────────────

export async function getSelfEmployedList(params: {
  search?: string;
  sort_col?: string;
  sort_dir?: "asc" | "desc";
  page_offset?: number;
  page_limit?: number;
}) {
  return callWizApi<{
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
    records: WizSelfEmployedRecord[];
  }>("get_self_employed_list", params);
}

export async function getSelfEmployedDetails(selfEmployedId: number) {
  return callWizApi<WizSelfEmployedDetails>("get_self_employed_details", { self_employed_id: selfEmployedId });
}

export async function updateSelfEmployed(selfEmployedId: number, data: Record<string, any>) {
  return callWizApi("update_self_employed", { self_employed_id: selfEmployedId, self_employed_data: data });
}

export async function toggleSelfEmployedStatus(userId: number) {
  return callWizApi<{ is_locked: boolean; isActive: boolean; message: string }>("toggle_self_employed_status", { user_id: userId });
}

export async function getSelfEmployedUser(userId: number) {
  return callWizApi<WizSelfEmployedUser>("get_self_employed_user", { user_id: userId });
}

export async function updateSelfEmployedUser(userId: number, userData: Record<string, any>) {
  return callWizApi("update_self_employed_user", { user_id: userId, user_data: userData });
}

export async function uploadSelfEmployedProfileImage(userId: number, imageBase64: string, fileName: string) {
  return callWizApi<{ profileImage: string; message: string }>("upload_self_employed_profile_image", {
    user_id: userId,
    image_base64: imageBase64,
    file_name: fileName,
  });
}

export async function getWageCategories() {
  return callWizApi<{ categories: WizWageCategory[] }>("get_wage_categories");
}

export async function getCountries() {
  return callWizApi<{ countries: WizCountry[] }>("get_countries");
}
