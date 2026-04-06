export function isLovableEditorPreview(): boolean {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;
  const inIframe = window.self !== window.top;

  return (
    hostname.includes('lovableproject.com') ||
    hostname.includes('preview--') ||
    hostname.includes('localhost') ||
    (hostname.includes('lovable.app') && inIframe)
  );
}