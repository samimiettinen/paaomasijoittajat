import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  memberId: string;
  adminLevel: string;
  tempPassword?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { memberId, adminLevel, tempPassword }: WelcomeEmailRequest = await req.json();

    // Fetch member details
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, first_name, last_name, email")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      throw new Error("Member not found");
    }

    if (!member.email) {
      throw new Error("Member has no email address");
    }

    // Create auth user if doesn't exist and we have a temp password
    let authCreated = false;
    let password = tempPassword;

    if (tempPassword) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === member.email);

      if (!existingUser) {
        // Create new auth user
        const { error: createError } = await supabase.auth.admin.createUser({
          email: member.email,
          password: tempPassword,
          email_confirm: true,
        });

        if (createError) {
          console.error("Failed to create auth user:", createError);
          // Continue anyway - user might already exist
        } else {
          authCreated = true;
        }
      } else {
        // Update password for existing user
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { password: tempPassword }
        );
        if (updateError) {
          console.error("Failed to update password:", updateError);
        }
      }
    }

    const baseUrl = "https://paaomaomistajat.lovable.app";
    const loginUrl = `${baseUrl}/login`;
    const resetPasswordUrl = `${baseUrl}/reset-password`;

    const roleLabel = adminLevel === 'super' ? 'Super Admin' : 
                      adminLevel === 'regular' ? 'Admin' : 'Vibe Coder';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Tervetuloa, ${member.first_name}!</h1>
        
        <p>Sinulle on myönnetty käyttöoikeudet Pääomaomistajat ry:n järjestelmään.</p>
        
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #2d3748; margin-top: 0;">Käyttäjätietosi</h2>
          
          <p><strong>🔐 Rooli:</strong> ${roleLabel}</p>
          <p><strong>📧 Sähköposti:</strong> ${member.email}</p>
          ${password ? `<p><strong>🔑 Väliaikainen salasana:</strong> ${password}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Kirjaudu sisään
          </a>
        </div>
        
        ${password ? `
        <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;">
            <strong>⚠️ Tärkeää:</strong> Vaihda salasanasi heti ensimmäisen kirjautumisen jälkeen omissa tiedoissasi.
          </p>
        </div>
        ` : ''}
        
        <div style="background-color: #e0f2fe; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; color: #0369a1;">
            <strong>Unohditko salasanasi?</strong>
          </p>
          <p style="margin: 0; color: #0369a1;">
            Voit nollata salasanasi milloin tahansa: <a href="${resetPasswordUrl}" style="color: #0369a1;">Nollaa salasana</a>
          </p>
        </div>
        
        <p style="color: #718096; font-size: 14px; margin-top: 40px;">
          Ystävällisin terveisin,<br>
          Pääomaomistajat ry
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Pääomaomistajat <noreply@byte.fi>",
        to: [member.email],
        subject: `Tervetuloa - Käyttöoikeudet myönnetty (${roleLabel})`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to send email");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome email sent successfully",
        authCreated,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-vibecoder-welcome function:", error);
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
