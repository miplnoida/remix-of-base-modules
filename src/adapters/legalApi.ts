// API Adapter Layer - abstracts legacy vs mock data access
import { legalConfig } from "@/config/legalConfig";
import type { MockCase } from "@/data/mockLegalCases";

// Generic API response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  loading?: boolean;
}

// Retry configuration
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

// Helper: retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = RETRY_ATTEMPTS
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempts <= 1) throw error;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    return withRetry(fn, attempts - 1);
  }
}

// ============= CASES ADAPTER =============
export const casesAdapter = {
  async list(filters?: Record<string, any>): Promise<ApiResponse<MockCase[]>> {
    if (legalConfig.dataMode === "mock") {
      // Return mock data from context/store
      return { data: [] }; // Context will provide the actual data
    }
    
    // Legacy mode - call existing endpoint
    try {
      const response = await withRetry(() =>
        fetch("/api/legal/cases?" + new URLSearchParams(filters || {}))
      );
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to fetch cases" };
    }
  },

  async get(id: string): Promise<ApiResponse<MockCase>> {
    if (legalConfig.dataMode === "mock") {
      return { data: undefined }; // Context will provide the actual data
    }
    
    try {
      const response = await withRetry(() => fetch(`/api/legal/cases/${id}`));
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to fetch case" };
    }
  },

  async create(caseData: Partial<MockCase>): Promise<ApiResponse<MockCase>> {
    if (legalConfig.dataMode === "mock") {
      return { data: undefined }; // Context will handle creation
    }
    
    try {
      const response = await withRetry(() =>
        fetch("/api/legal/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(caseData),
        })
      );
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to create case" };
    }
  },

  async update(id: string, updates: Partial<MockCase>): Promise<ApiResponse<MockCase>> {
    if (legalConfig.dataMode === "mock") {
      return { data: undefined }; // Context will handle update
    }
    
    try {
      const response = await withRetry(() =>
        fetch(`/api/legal/cases/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })
      );
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to update case" };
    }
  },
};

// ============= PARTIES ADAPTER =============
export const partiesAdapter = {
  async list(caseId: string) {
    if (legalConfig.dataMode === "mock") {
      return { data: [] };
    }
    
    try {
      const response = await withRetry(() =>
        fetch(`/api/legal/cases/${caseId}/parties`)
      );
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to fetch parties" };
    }
  },

  async create(caseId: string, partyData: any) {
    if (legalConfig.dataMode === "mock") {
      return { data: undefined };
    }
    
    try {
      const response = await withRetry(() =>
        fetch(`/api/legal/cases/${caseId}/parties`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partyData),
        })
      );
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to create party" };
    }
  },
};

// ============= DOCUMENTS ADAPTER =============
export const documentsAdapter = {
  async list(caseId: string) {
    if (legalConfig.dataMode === "mock") {
      return { data: [] };
    }
    
    try {
      const response = await withRetry(() =>
        fetch(`/api/legal/cases/${caseId}/documents`)
      );
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to fetch documents" };
    }
  },

  async upload(caseId: string, documentData: any) {
    if (legalConfig.dataMode === "mock") {
      return { data: undefined };
    }
    
    try {
      const response = await withRetry(() =>
        fetch(`/api/legal/cases/${caseId}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(documentData),
        })
      );
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to upload document" };
    }
  },
};

// ============= HEARINGS ADAPTER =============
export const hearingsAdapter = {
  async list(caseId?: string) {
    if (legalConfig.dataMode === "mock") {
      return { data: [] };
    }
    
    const url = caseId
      ? `/api/legal/cases/${caseId}/hearings`
      : "/api/legal/hearings";
    
    try {
      const response = await withRetry(() => fetch(url));
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to fetch hearings" };
    }
  },

  async create(caseId: string, hearingData: any) {
    if (legalConfig.dataMode === "mock") {
      return { data: undefined };
    }
    
    try {
      const response = await withRetry(() =>
        fetch(`/api/legal/cases/${caseId}/hearings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hearingData),
        })
      );
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to create hearing" };
    }
  },
};

// ============= TASKS ADAPTER =============
export const tasksAdapter = {
  async list(caseId: string) {
    if (legalConfig.dataMode === "mock") {
      return { data: [] };
    }
    
    try {
      const response = await withRetry(() =>
        fetch(`/api/legal/cases/${caseId}/tasks`)
      );
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to fetch tasks" };
    }
  },

  async create(caseId: string, taskData: any) {
    if (legalConfig.dataMode === "mock") {
      return { data: undefined };
    }
    
    try {
      const response = await withRetry(() =>
        fetch(`/api/legal/cases/${caseId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        })
      );
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to create task" };
    }
  },
};

// ============= REPORTS ADAPTER =============
export const reportsAdapter = {
  async getMetrics(filters?: Record<string, any>) {
    if (legalConfig.dataMode === "mock") {
      return { data: null }; // Will be computed from mock data
    }
    
    try {
      const response = await withRetry(() =>
        fetch("/api/legal/reports/metrics?" + new URLSearchParams(filters || {}))
      );
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to fetch metrics" };
    }
  },
};

// Export all adapters
export const legalApi = {
  cases: casesAdapter,
  parties: partiesAdapter,
  documents: documentsAdapter,
  hearings: hearingsAdapter,
  tasks: tasksAdapter,
  reports: reportsAdapter,
};
