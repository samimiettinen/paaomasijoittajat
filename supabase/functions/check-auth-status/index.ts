import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CheckAuthRequest {
  emails: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { emails }: CheckAuthRequest = await req.json();

    if (!emails || !Array.isArray(emails)) {
      throw new Error("emails array is required");
    }

    // Get all auth users
    const { data: authUsers, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }

    // Create a map of email -> has auth account
    const authEmails = new Set(
      authUsers.users
        .filter(u => u.email)
        .map(u => u.email!.toLowerCase())
    );

    // Check each email
    const results: Record<string, boolean> = {};
    for (const email of emails) {
      if (email) {
        results[email.toLowerCase()] = authEmails.has(email.toLowerCase());
      }
    }

    return new Response(
      JSON.stringify({ results }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-auth-status function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
