import { legalConfig } from "@/config/legalConfig";

export interface NotificationDispatch {
  channel: "Email" | "SMS" | "Print";
  to: string[];
  templateId: string;
  mergeData: Record<string, any>;
  caseId?: string;
}

export interface DispatchResult {
  messageId: string;
  status: "Sent" | "Queued" | "Failed";
  sentAt: string;
}

export const notificationsAdapter = {
  async dispatch(data: NotificationDispatch): Promise<DispatchResult> {
    if (legalConfig.dataMode === "mock") {
      await new Promise(resolve => setTimeout(resolve, 150));
      console.log('[Notifications] Mock dispatch:', data);
      return {
        messageId: `MSG-${Date.now()}`,
        status: "Sent",
        sentAt: new Date().toISOString()
      };
    }
    
    const response = await fetch('/api/notifications/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Dispatch failed');
    return response.json();
  }
};
