/**
 * Satellite micro-frontend configuration.
 *
 * Hard-coded here (instead of VITE_* env vars) so it works reliably in
 * Lovable preview, published .lovable.app, and the custom *.secureserve.biz
 * domains without requiring workspace Build Secrets.
 *
 * To add/disable a satellite, edit this file and republish the host.
 */

export type SatelliteUrlPair = {
  preview: string;
  production: string;
};

export type SatelliteEntry = {
  enabled: boolean;
  url: SatelliteUrlPair;
  allowedOrigins: string[];
};

export const SATELLITE_CONFIG: Record<'compliance' | 'audit', SatelliteEntry> = {
  compliance: {
    enabled: true,
    url: {
      preview: 'https://id-preview--8471f73c-7659-4260-8d4d-c70dfbebe261.lovable.app',
      production: 'https://compliance.secureserve.biz',
    },
    allowedOrigins: [
      'https://id-preview--8471f73c-7659-4260-8d4d-c70dfbebe261.lovable.app',
      'https://compliance.secureserve.biz',
    ],
  },
  audit: {
    enabled: true,
    url: {
      preview: 'https://id-preview--7e98fc6b-f149-4e9f-9fd2-cbef90aba410.lovable.app',
      production: 'https://internalaudit.secureserve.biz',
    },
    allowedOrigins: [
      'https://id-preview--7e98fc6b-f149-4e9f-9fd2-cbef90aba410.lovable.app',
      'https://internalaudit.secureserve.biz',
    ],
  },
};

/**
 * Pick the satellite URL appropriate for the current host environment:
 * use the preview URL when the host is itself running on a Lovable preview
 * domain, otherwise use the production URL.
 */
export const pickSatelliteUrl = (cfg: SatelliteEntry): string => {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isPreview = host.includes('id-preview--') || host.endsWith('.lovable.app');
  return isPreview ? cfg.url.preview : cfg.url.production;
};
