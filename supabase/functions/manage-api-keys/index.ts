import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const prefix = "pk_live_";
  let key = prefix;
  const randomBytes = new Uint8Array(40);
  crypto.getRandomValues(randomBytes);
  for (const byte of randomBytes) {
    key += chars[byte % chars.length];
  }
  return key;
}

// --- AES-GCM encryption using a key derived from SUPABASE_SERVICE_ROLE_KEY ---

async function getDerivedKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("lovable-api-key-encryption"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptApiKey(plainKey: string): Promise<string> {
  const derivedKey = await getDerivedKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainKey);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    encoded
  );
  // Store as base64: iv (12 bytes) + ciphertext
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptApiKey(encryptedB64: string): Promise<string> {
  const derivedKey = await getDerivedKey();
  const combined = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

// ---

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function saveScopes(supabase: ReturnType<typeof createClient>, keyId: string, registryIds: string[], userId: string) {
  await supabase.from("api_key_scope_assignments").delete().eq("api_key_id", keyId);
  if (registryIds.length > 0) {
    const rows = registryIds.map((rid) => ({
      api_key_id: keyId,
      api_registry_id: rid,
      is_allowed: true,
      created_by: userId,
    }));
    const { error } = await supabase.from("api_key_scope_assignments").insert(rows);
    if (error) throw error;
  }
}

async function isAdmin(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "administrator")
    .maybeSingle();
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ status: "error", message: "Unauthorized" }, 401);
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ status: "error", message: "Invalid token" }, 401);
    }
    const userId = user.id;

    const supabase = getServiceClient();
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "generate": {
        const { app_name, rate_limit_per_minute = 60, allowed_endpoints = [], allowed_ip_addresses = [], expires_at, scope_api_registry_ids = [] } = body;

        if (!app_name?.trim()) {
          return jsonResponse({ status: "error", message: "app_name is required" }, 400);
        }

        const plainKey = generateApiKey();
        const keyHash = await hashKey(plainKey);
        const keyPrefix = plainKey.substring(0, 8);
        const encryptedKey = await encryptApiKey(plainKey);

        const { data, error } = await supabase
          .from("public_api_keys")
          .insert({
            key_hash: keyHash,
            key_prefix: keyPrefix,
            encrypted_key: encryptedKey,
            app_name: app_name.trim(),
            rate_limit_per_minute,
            allowed_endpoints,
            allowed_ip_addresses,
            expires_at: expires_at || null,
            created_by: userId,
          })
          .select("id, key_prefix, app_name, status, rate_limit_per_minute, allowed_endpoints, allowed_ip_addresses, expires_at, created_at")
          .single();

        if (error) throw error;

        if (scope_api_registry_ids.length > 0) {
          await saveScopes(supabase, data.id, scope_api_registry_ids, userId);
        }

        return jsonResponse({
          status: "success",
          message: "API key generated. Store it securely.",
          data: { ...data, plain_key: plainKey },
        });
      }

      case "list": {
        const { data, error } = await supabase
          .from("public_api_keys")
          .select("id, key_prefix, app_name, status, rate_limit_per_minute, allowed_endpoints, allowed_ip_addresses, expires_at, created_at, updated_at, revoked_at")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const keyIds = (data || []).map((k: Record<string, unknown>) => k.id as string);
        let lastUsedMap: Record<string, string> = {};
        let scopeCountMap: Record<string, number> = {};

        if (keyIds.length > 0) {
          const [logsRes, scopesRes] = await Promise.all([
            supabase.from("public_api_access_logs").select("api_key_id, created_at").in("api_key_id", keyIds).order("created_at", { ascending: false }),
            supabase.from("api_key_scope_assignments").select("api_key_id").in("api_key_id", keyIds).eq("is_allowed", true),
          ]);

          if (logsRes.data) {
            for (const log of logsRes.data) {
              if (!lastUsedMap[log.api_key_id]) lastUsedMap[log.api_key_id] = log.created_at;
            }
          }
          if (scopesRes.data) {
            for (const s of scopesRes.data) {
              scopeCountMap[s.api_key_id] = (scopeCountMap[s.api_key_id] || 0) + 1;
            }
          }
        }

        const enriched = (data || []).map((key: Record<string, unknown>) => ({
          ...key,
          last_used: lastUsedMap[key.id as string] || null,
          scope_count: scopeCountMap[key.id as string] ?? null,
        }));

        return jsonResponse({ status: "success", data: enriched });
      }

      case "reveal": {
        const { key_id } = body;
        if (!key_id) return jsonResponse({ status: "error", message: "key_id is required" }, 400);

        // Admin-only check
        const adminCheck = await isAdmin(supabase, userId);
        if (!adminCheck) {
          return jsonResponse({ status: "error", message: "Only administrators can reveal API keys" }, 403);
        }

        const { data: keyRow, error: fetchErr } = await supabase
          .from("public_api_keys")
          .select("id, app_name, encrypted_key, status")
          .eq("id", key_id)
          .single();

        if (fetchErr || !keyRow) return jsonResponse({ status: "error", message: "API key not found" }, 404);
        if (!keyRow.encrypted_key) return jsonResponse({ status: "error", message: "This key was created before encrypted storage was enabled. It cannot be revealed." }, 400);

        const plainKey = await decryptApiKey(keyRow.encrypted_key);
        return jsonResponse({ status: "success", data: { id: keyRow.id, plain_key: plainKey } });
      }

      case "regenerate": {
        const { key_id: regenKeyId } = body;
        if (!regenKeyId) return jsonResponse({ status: "error", message: "key_id is required" }, 400);

        const { data: existingKey, error: fetchErr } = await supabase
          .from("public_api_keys")
          .select("id, app_name, status")
          .eq("id", regenKeyId)
          .single();

        if (fetchErr || !existingKey) return jsonResponse({ status: "error", message: "API key not found" }, 404);
        if (existingKey.status !== "active") return jsonResponse({ status: "error", message: "Only active keys can be regenerated" }, 400);

        const newPlainKey = generateApiKey();
        const newKeyHash = await hashKey(newPlainKey);
        const newKeyPrefix = newPlainKey.substring(0, 8);
        const newEncryptedKey = await encryptApiKey(newPlainKey);

        const { error: updateErr } = await supabase
          .from("public_api_keys")
          .update({ key_hash: newKeyHash, key_prefix: newKeyPrefix, encrypted_key: newEncryptedKey, updated_at: new Date().toISOString() })
          .eq("id", regenKeyId);

        if (updateErr) throw updateErr;

        return jsonResponse({
          status: "success",
          message: "API key regenerated successfully.",
          data: { id: regenKeyId, key_prefix: newKeyPrefix, plain_key: newPlainKey },
        });
      }

      case "revoke": {
        const { key_id, reason } = body;
        if (!key_id) return jsonResponse({ status: "error", message: "key_id is required" }, 400);

        const { error } = await supabase
          .from("public_api_keys")
          .update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_by: userId })
          .eq("id", key_id);

        if (error) throw error;
        return jsonResponse({ status: "success", message: "API key revoked" });
      }

      case "update": {
        const { key_id, rate_limit_per_minute, allowed_endpoints, allowed_ip_addresses, expires_at, scope_api_registry_ids } = body;
        if (!key_id) return jsonResponse({ status: "error", message: "key_id is required" }, 400);

        const updateData: Record<string, unknown> = {};
        if (rate_limit_per_minute !== undefined) updateData.rate_limit_per_minute = rate_limit_per_minute;
        if (allowed_endpoints !== undefined) updateData.allowed_endpoints = allowed_endpoints;
        if (allowed_ip_addresses !== undefined) updateData.allowed_ip_addresses = allowed_ip_addresses;
        if (expires_at !== undefined) updateData.expires_at = expires_at;

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase.from("public_api_keys").update(updateData).eq("id", key_id);
          if (error) throw error;
        }

        if (scope_api_registry_ids !== undefined) {
          await saveScopes(supabase, key_id, scope_api_registry_ids, userId);
        }

        return jsonResponse({ status: "success", message: "API key updated" });
      }

      case "usage": {
        const { key_id, limit = 100 } = body;
        if (!key_id) return jsonResponse({ status: "error", message: "key_id is required" }, 400);

        const { data, error } = await supabase
          .from("public_api_access_logs")
          .select("*")
          .eq("api_key_id", key_id)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        return jsonResponse({ status: "success", data });
      }

      default:
        return jsonResponse({ status: "error", message: "Unknown action. Use: generate, list, revoke, regenerate, reveal, update, usage" }, 400);
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return jsonResponse({ status: "error", message: "Server error", error: { details: errorMessage } }, 500);
  }
});
