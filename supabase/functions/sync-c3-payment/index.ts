import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Validate JWT from caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { payment_id, receipt_id } = await req.json();
    if (!payment_id || !receipt_id) {
      return new Response(
        JSON.stringify({ error: "payment_id and receipt_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Idempotency check
    const { data: existingLog } = await supabase
      .from("payment_sync_log")
      .select("id, sync_status")
      .eq("payment_id", payment_id)
      .eq("receipt_id", receipt_id)
      .eq("sync_status", "success")
      .maybeSingle();

    if (existingLog) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Already synced",
          sync_log_id: existingLog.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch receipt
    const { data: receipt, error: receiptErr } = await supabase
      .from("cn_receipt")
      .select("receipt_id, receipt_number, receipt_total, created_at")
      .eq("receipt_id", receipt_id)
      .single();
    if (receiptErr || !receipt) {
      return new Response(
        JSON.stringify({ error: "Receipt not found", detail: receiptErr?.message }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch payment header
    const { data: header, error: headerErr } = await supabase
      .from("cn_payment_header")
      .select("payer_id, payer_type")
      .eq("payment_id", payment_id)
      .single();
    if (headerErr || !header) {
      return new Response(
        JSON.stringify({ error: "Payment header not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch first component for period and sequence_no
    const { data: component } = await supabase
      .from("c3_payment_components")
      .select("period, sequence_no")
      .eq("payment_id", payment_id)
      .limit(1)
      .maybeSingle();

    // Parse period (MM/YYYY)
    let periodMonth = "";
    let periodYear = "";
    if (component?.period) {
      const parts = component.period.split("/");
      if (parts.length === 2) {
        periodMonth = String(parseInt(parts[0], 10)); // normalize 03 → 3
        periodYear = parts[1];
      }
    }

    // Fetch base currency
    const { data: currency } = await supabase
      .from("tb_currencies")
      .select("currency_code")
      .eq("is_main_currency", true)
      .limit(1)
      .maybeSingle();
    const baseCurrency = currency?.currency_code || "XCD";

    // Fetch API config
    const { data: apiConfig, error: apiErr } = await supabase
      .from("api_settings")
      .select("base_url, api_key, header_name, is_active")
      .eq("setting_key", "c3_received_payment_sync")
      .maybeSingle();

    if (apiErr || !apiConfig) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "API configuration not found for c3_received_payment_sync",
          not_configured: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!apiConfig.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "API sync is disabled",
          not_configured: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build payload per PDF spec
    const receiptDate = receipt.created_at
      ? new Date(receipt.created_at).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const payload: Record<string, string | undefined> = {
      registration_number: header.payer_id,
      payer_type: header.payer_type,
      period_month: periodMonth,
      period_year: periodYear,
      receipt_number: receipt.receipt_number || String(receipt.receipt_id),
      payment_id: String(payment_id),
      receipt_date: receiptDate,
      currency: baseCurrency,
      receipt_amount: String(receipt.receipt_total || 0),
    };

    // Conditional fields
    if (header.payer_type === "SE") {
      payload.ssn = header.payer_id;
    }
    if (header.payer_type === "ER") {
      payload.schedule_number = component?.sequence_no != null
        ? String(component.sequence_no)
        : undefined;
    }

    // Remove undefined keys
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined)
    );

    // Retry logic with exponential backoff
    const MAX_RETRIES = 3;
    const BACKOFF_MS = [1000, 2000, 4000];
    let lastError = "";
    let lastHttpStatus: number | null = null;
    let lastResponseBody: unknown = null;
    let syncSuccess = false;
    let externalPaymentId: string | null = null;
    let isDuplicate = false;

    const apiHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiConfig.header_name && apiConfig.api_key) {
      apiHeaders[apiConfig.header_name] = apiConfig.api_key;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const resp = await fetch(apiConfig.base_url!, {
          method: "POST",
          headers: apiHeaders,
          body: JSON.stringify(cleanPayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        lastHttpStatus = resp.status;

        const body = await resp.text();
        try {
          lastResponseBody = JSON.parse(body);
        } catch {
          lastResponseBody = body;
        }

        if (resp.ok) {
          const parsed =
            typeof lastResponseBody === "object" && lastResponseBody !== null
              ? (lastResponseBody as Record<string, unknown>)
              : {};
          syncSuccess = true;
          externalPaymentId = parsed.payment_id
            ? String(parsed.payment_id)
            : null;
          isDuplicate = parsed.duplicate === true;
          break;
        }

        // Non-retryable client errors
        if (resp.status >= 400 && resp.status < 500) {
          lastError = `HTTP ${resp.status}: ${typeof lastResponseBody === "object" ? JSON.stringify(lastResponseBody) : body}`;
          break;
        }

        lastError = `HTTP ${resp.status}`;
      } catch (err: unknown) {
        lastError =
          err instanceof Error ? err.message : "Unknown fetch error";
      }

      // Wait before retry (skip after last attempt)
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
      }
    }

    // Upsert sync log
    const logRow = {
      payment_id,
      receipt_id,
      receipt_number: receipt.receipt_number || String(receipt.receipt_id),
      sync_status: syncSuccess ? "success" : "failed",
      request_payload: cleanPayload,
      response_payload: lastResponseBody ?? null,
      http_status: lastHttpStatus,
      error_message: syncSuccess ? null : lastError,
      retry_count: 0,
      external_payment_id: externalPaymentId,
      is_duplicate: isDuplicate,
      updated_at: new Date().toISOString(),
      initiated_by: user.email || user.id,
    };

    // Try update first (existing failed row), then insert
    const { data: existingRow } = await supabase
      .from("payment_sync_log")
      .select("id, retry_count")
      .eq("payment_id", payment_id)
      .eq("receipt_id", receipt_id)
      .maybeSingle();

    if (existingRow) {
      await supabase
        .from("payment_sync_log")
        .update({
          ...logRow,
          retry_count: (existingRow.retry_count || 0) + 1,
        })
        .eq("id", existingRow.id);
    } else {
      await supabase.from("payment_sync_log").insert(logRow);
    }

    return new Response(
      JSON.stringify({
        success: syncSuccess,
        error: syncSuccess ? undefined : lastError,
        external_payment_id: externalPaymentId,
        is_duplicate: isDuplicate,
        http_status: lastHttpStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
