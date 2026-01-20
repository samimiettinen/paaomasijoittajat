import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EventInvitationRequest {
  eventId: string;
  memberIds: string[];
  senderMemberId?: string;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  location_name: string | null;
  location_address: string | null;
  location_city: string | null;
  invitation_text: string | null;
  email_signature: string | null;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { eventId, memberIds, senderMemberId }: EventInvitationRequest = await req.json();

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    // Fetch member details
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, first_name, last_name, email")
      .in("id", memberIds);

    if (membersError) {
      throw new Error("Failed to fetch members");
    }

    // Fetch invitation tokens for all participants
    const { data: participants, error: participantsError } = await supabase
      .from("event_participants")
      .select("member_id, invitation_token")
      .eq("event_id", eventId)
      .in("member_id", memberIds);

    if (participantsError) {
      throw new Error("Failed to fetch participant tokens");
    }

    // Create a map of member_id to invitation_token
    const tokenMap = new Map<string, string>();
    for (const p of participants || []) {
      if (p.invitation_token) {
        tokenMap.set(p.member_id, p.invitation_token);
      }
    }

    // Get the base URL for RSVP links
    const baseUrl = "https://paaomasijoittajat.lovable.app";

    const results: { memberId: string; success: boolean; error?: string }[] = [];

    for (const member of members as Member[]) {
      if (!member.email) {
        results.push({
          memberId: member.id,
          success: false,
          error: "No email address",
        });
        continue;
      }

      try {
        const eventDate = new Date(event.event_date).toLocaleDateString("fi-FI", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const location = [event.location_name, event.location_address, event.location_city]
          .filter(Boolean)
          .join(", ");

        const invitationToken = tokenMap.get(member.id);
        const rsvpUrl = invitationToken ? `${baseUrl}/rsvp?token=${invitationToken}` : null;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a365d;">Hei ${member.first_name}!</h1>
            
            <p>Olet saanut kutsun tapahtumaan:</p>
            
            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #2d3748; margin-top: 0;">${event.title}</h2>
              
              <p><strong>📅 Päivämäärä:</strong> ${eventDate}</p>
              <p><strong>🕐 Aika:</strong> ${event.start_time} - ${event.end_time}</p>
              ${location ? `<p><strong>📍 Paikka:</strong> ${location}</p>` : ""}
              ${event.description ? `<p><strong>📝 Kuvaus:</strong> ${event.description}</p>` : ""}
            </div>
            
            ${event.invitation_text ? `
            <div style="background-color: #edf2f7; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <p style="margin: 0; white-space: pre-wrap;">${event.invitation_text}</p>
            </div>
            ` : ""}
            
            ${rsvpUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${rsvpUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Ilmoittaudu tapahtumaan
              </a>
            </div>
            
            <p style="text-align: center; color: #718096; font-size: 14px;">
              Tai kopioi tämä linkki selaimeen:<br>
              <a href="${rsvpUrl}" style="color: #2563eb;">${rsvpUrl}</a>
            </p>
            ` : `
            <p>Vahvista osallistumisesi vastaamalla tähän kutsuun.</p>
            `}
            
            ${event.email_signature ? `
            <p style="color: #718096; font-size: 14px; margin-top: 40px; white-space: pre-wrap;">
              ${event.email_signature}
            </p>
            ` : ''}
          </div>
        `;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Pääomasijoittajat <noreply@byte.fi>",
            to: [member.email],
            subject: `Kutsu: ${event.title}`,
            html: emailHtml,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to send email");
        }

        // Log email send to database
        const { error: insertError } = await supabase.from("email_sends").insert({
          event_id: eventId,
          member_id: member.id,
          email_address: member.email,
          sent_by_member_id: senderMemberId || null,
        });

        if (insertError) {
          console.error("Failed to log email send:", insertError);
        }

        results.push({ memberId: member.id, success: true });
      } catch (emailError: any) {
        results.push({
          memberId: member.id,
          success: false,
          error: emailError.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        message: `Sent ${successCount} emails, ${failCount} failed`,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-event-invitation function:", error);
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
