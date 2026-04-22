import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TestEnvironment, ApiKey } from './types';

const ACTIVE_ENV_LS = 'atc.activeEnvKey';
const SELECTED_KEY_LS = 'atc.selectedApiKeyId';
const REVEALED_KEYS_LS = 'atc.revealedKeys'; // { [keyId]: plaintext } — session memory only
const ACCESS_TOKEN_LS = 'atc.lastAccessToken';
const REFRESH_TOKEN_LS = 'atc.lastRefreshToken';

export function getRevealedKey(keyId: string): string | null {
  try {
    const raw = sessionStorage.getItem(REVEALED_KEYS_LS);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[keyId] || null;
  } catch { return null; }
}

export function setRevealedKey(keyId: string, plaintext: string) {
  try {
    const raw = sessionStorage.getItem(REVEALED_KEYS_LS);
    const map = raw ? JSON.parse(raw) : {};
    map[keyId] = plaintext;
    sessionStorage.setItem(REVEALED_KEYS_LS, JSON.stringify(map));
  } catch { /* ignore */ }
}

export function setSelectedKeyId(id: string | null) {
  if (id) localStorage.setItem(SELECTED_KEY_LS, id);
  else localStorage.removeItem(SELECTED_KEY_LS);
}

export function getSelectedKeyId(): string | null {
  return localStorage.getItem(SELECTED_KEY_LS);
}

export function setLastTokens(access: string | null, refresh?: string | null) {
  if (access) sessionStorage.setItem(ACCESS_TOKEN_LS, access);
  else sessionStorage.removeItem(ACCESS_TOKEN_LS);
  if (refresh !== undefined) {
    if (refresh) sessionStorage.setItem(REFRESH_TOKEN_LS, refresh);
    else sessionStorage.removeItem(REFRESH_TOKEN_LS);
  }
}

export function getLastAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_LS);
}

export function getLastRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_LS);
}

/**
 * Loads the active environment, available API keys, and resolves the API key
 * plaintext (calling reveal action on demand if not yet in session memory).
 */
export function useTestContext() {
  const [env, setEnv] = useState<TestEnvironment | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [selectedKeyId, _setSelectedKeyId] = useState<string | null>(getSelectedKeyId());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const envKey = localStorage.getItem(ACTIVE_ENV_LS) || 'test';
      const [{ data: e }, k] = await Promise.all([
        supabase.from('api_test_environments').select('*').eq('env_key', envKey).maybeSingle(),
        supabase.functions.invoke('manage-api-keys', { body: { action: 'list' } }),
      ]);
      const envRow = (e as any) || null;
      setEnv(envRow);
      setKeys(k.data?.data || []);
      // Auto-pick: explicit selection > env default > first active
      let chosen = getSelectedKeyId();
      if (!chosen && envRow?.default_api_key_id) chosen = envRow.default_api_key_id;
      if (!chosen) {
        const firstActive = (k.data?.data || []).find((x: ApiKey) => x.status === 'active');
        if (firstActive) chosen = firstActive.id;
      }
      _setSelectedKeyId(chosen);
      setLoading(false);
    })();
  }, []);

  const selectKey = (id: string | null) => {
    setSelectedKeyId(id);
    _setSelectedKeyId(id);
  };

  /** Returns the API-key plaintext, fetching via `reveal` on first use. */
  const getApiKeyPlaintext = async (): Promise<string | null> => {
    if (!selectedKeyId) return null;
    const cached = getRevealedKey(selectedKeyId);
    if (cached) return cached;
    const { data } = await supabase.functions.invoke('manage-api-keys', { body: { action: 'reveal', key_id: selectedKeyId } });
    if (data?.status === 'success' && data.api_key) {
      setRevealedKey(selectedKeyId, data.api_key);
      return data.api_key;
    }
    return null;
  };

  return { env, keys, selectedKeyId, selectKey, loading, getApiKeyPlaintext };
}
