import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN")!;
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const GRAPH_URL = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: jobs, error: jobsError } = await admin
      .from("reminder_jobs")
      .select(`
        id, session_id, scheduled_for,
        sessions (
          id, scheduled_start_at, zoom_join_url,
          students (
            first_name, last_name, phone_e164
          )
        )
      `)
      .eq("channel", "WHATSAPP")
      .eq("status", "PENDING")
      .lte("scheduled_for", new Date().toISOString());

    if (jobsError) {
      return new Response(JSON.stringify({ error: jobsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const job of jobs) {
      const sess = job.sessions;
      const student = sess?.students;
      const toPhone = student?.phone_e164;

      if (!toPhone) {
        await admin
          .from("reminder_jobs")
          .update({ status: "FAILED", last_error: "Missing student phone" })
          .eq("id", job.id);
        continue;
      }

      const studentName = `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || "Student";
      const startLocal = new Date(sess.scheduled_start_at).toLocaleString();
      const text = [
        `Reminder: Your tutoring session starts at ${startLocal}.`,
        `Student: ${studentName}`,
        sess.zoom_join_url ? `Zoom: ${sess.zoom_join_url}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const resp = await fetch(GRAPH_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toPhone.replace(/\s+/g, ""),
          type: "text",
          text: { body: text },
        }),
      });

      if (resp.ok) {
        await admin.from("reminder_jobs").update({ status: "SENT", last_error: null }).eq("id", job.id);
      } else {
        const err = await resp.json().catch(() => ({}));
        await admin
          .from("reminder_jobs")
          .update({ status: "FAILED", last_error: JSON.stringify(err) })
          .eq("id", job.id);
      }
    }

    return new Response(JSON.stringify({ processed: jobs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


