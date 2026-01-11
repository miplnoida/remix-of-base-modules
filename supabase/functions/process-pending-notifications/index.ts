import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch pending/queued notifications
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('notification_logs')
      .select('*')
      .in('status', ['queued', 'pending'])
      .eq('channel', 'email')
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${pendingNotifications?.length || 0} pending notifications`);

    // Since no email provider is configured, we just log the pending notifications
    // This function can be extended to integrate with any email service in the future
    const results = [];

    for (const notification of pendingNotifications || []) {
      console.log(`Notification ${notification.id}:`);
      console.log(`  To: ${notification.recipient_address}`);
      console.log(`  Subject: ${notification.subject}`);
      console.log(`  Status: ${notification.status}`);
      
      results.push({ 
        id: notification.id, 
        status: notification.status,
        recipient: notification.recipient_address,
        subject: notification.subject,
        message: 'Email provider not configured - notification remains in queue'
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pending notifications retrieved (email provider not configured)',
        pending_count: results.length,
        notifications: results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error processing notifications:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
