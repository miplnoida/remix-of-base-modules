/**
 * Detects whether the app is running inside the Lovable **editor** iframe.
 *
 * The editor preview loads the app inside an iframe on `lovableproject.com`
 * or `lovable.app`. In that environment, Supabase auth POST requests can
 * hang due to the platform's fetch proxy — so we use this check to skip
 * Turnstile and show clear messaging.
 *
 * **Share Preview** (opened in its own tab via the Share button) must NOT
 * be treated as the editor iframe. Share Preview URLs look like
 * `id-preview--<project-id>.lovable.app` but are NOT inside an iframe.
 *
 * `localhost` is always treated as editor preview for local dev convenience.
 */
export function isLovableEditorPreview(): boolean {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;

  // localhost is always treated as dev/editor preview
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

  // The key distinction: the editor embeds the preview in an iframe.
  // Share Preview and published URLs open in their own tab (top-level window).
  const inIframe = window.self !== window.top;
  if (!inIframe) return false;

  // Inside an iframe on a Lovable domain → editor preview
  return (
    hostname.includes('lovableproject.com') ||
    hostname.includes('lovable.app')
  );
}
