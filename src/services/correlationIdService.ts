/**
 * Correlation ID Service
 * Generates and manages correlation IDs for tracking requests across all system logs
 */

// Generate a new UUID v4 correlation ID
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

// Session storage key for the current correlation ID
const CORRELATION_ID_KEY = 'current_correlation_id';
const SESSION_ID_KEY = 'session_id';

// Get or create a session ID (persists across page loads)
export function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

// Get the current correlation ID or generate a new one
export function getCorrelationId(): string {
  let correlationId = sessionStorage.getItem(CORRELATION_ID_KEY);
  if (!correlationId) {
    correlationId = generateCorrelationId();
    sessionStorage.setItem(CORRELATION_ID_KEY, correlationId);
  }
  return correlationId;
}

// Set a new correlation ID (useful when starting a new request chain)
export function setCorrelationId(id?: string): string {
  const correlationId = id || generateCorrelationId();
  sessionStorage.setItem(CORRELATION_ID_KEY, correlationId);
  return correlationId;
}

// Clear the current correlation ID (generates new one on next get)
export function clearCorrelationId(): void {
  sessionStorage.removeItem(CORRELATION_ID_KEY);
}

// Get device info for logging
export function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  return `${platform} - ${ua.substring(0, 100)}`;
}

// Get the current user's IP address (best effort, may not work in all cases)
export async function getClientIp(): Promise<string> {
  try {
    // This is a placeholder - in production you'd get this from your server
    // or use a service like ipify
    return 'client-side';
  } catch {
    return 'unknown';
  }
}

export interface LogContext {
  correlationId: string;
  sessionId: string;
  userId?: string;
  ipAddress?: string;
  deviceInfo: string;
  timestamp: string;
}

// Create a log context object with all tracking info
export function createLogContext(userId?: string): LogContext {
  return {
    correlationId: getCorrelationId(),
    sessionId: getSessionId(),
    userId,
    deviceInfo: getDeviceInfo(),
    timestamp: new Date().toISOString(),
  };
}
