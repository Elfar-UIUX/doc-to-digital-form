// @ts-nocheck
/* eslint-disable */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULT_WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN") || "";
const DEFAULT_WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("Function invoked:", req.method, new Date().toISOString());
  
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Validate environment variables
    if (!SUPABASE_URL) {
      console.error("SUPABASE_URL is missing");
      throw new Error("SUPABASE_URL environment variable is not set");
    }
    if (!SERVICE_ROLE_KEY) {
      console.error("SERVICE_ROLE_KEY is missing");
      throw new Error("SERVICE_ROLE_KEY environment variable is not set");
    }

    console.log("Creating Supabase client...");
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const now = new Date().toISOString();
    console.log("Querying reminder_jobs for jobs scheduled before:", now);

    const { data: jobs, error: jobsError } = await admin
      .from("reminder_jobs")
      .select(`
        id, session_id, scheduled_for,
        sessions (
          id, scheduled_start_at, zoom_join_url, created_by,
          students (
            first_name, last_name, phone_e164
          )
        )
      `)
      .eq("channel", "WHATSAPP")
      .eq("status", "PENDING")
      .lte("scheduled_for", now);

    if (jobsError) {
      console.error("Error querying reminder_jobs:", jobsError);
      return new Response(JSON.stringify({ error: jobsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${jobs?.length || 0} pending reminder jobs`);

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const job of jobs) {
      console.log(`Processing job ${job.id} for session ${job.session_id}`);
      const sess = job.sessions;
      
      if (!sess) {
        console.error(`Session not found for job ${job.id}`);
        await admin
          .from("reminder_jobs")
          .update({ status: "FAILED", last_error: "Session not found" })
          .eq("id", job.id);
        continue;
      }

      const student = sess.students;
      if (!student) {
        console.error(`Student not found for session ${sess.id}`);
        await admin
          .from("reminder_jobs")
          .update({ status: "FAILED", last_error: "Student not found" })
          .eq("id", job.id);
        continue;
      }

      const toPhone = student.phone_e164;

      if (!toPhone) {
        console.error(`Missing phone for student in job ${job.id}`);
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

      // Resolve WhatsApp credentials: per-user from profiles or fall back to env
      let phoneNumberId = DEFAULT_WHATSAPP_PHONE_NUMBER_ID;
      let token = DEFAULT_WHATSAPP_TOKEN;

      if (sess?.created_by) {
        const { data: profile } = await admin
          .from("profiles")
          .select("whatsapp_phone_number_id, whatsapp_token")
          .eq("id", sess.created_by)
          .maybeSingle();
        if (profile?.whatsapp_phone_number_id && profile?.whatsapp_token) {
          phoneNumberId = profile.whatsapp_phone_number_id;
          token = profile.whatsapp_token;
        }
      }

      if (!phoneNumberId || !token) {
        console.error(`Missing WhatsApp credentials for job ${job.id}`);
        await admin
          .from("reminder_jobs")
          .update({ status: "FAILED", last_error: "Missing WhatsApp credentials" })
          .eq("id", job.id);
        continue;
      }

      console.log(`Sending WhatsApp message for job ${job.id} to ${toPhone}`);
      const graphUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

      const resp = await fetch(graphUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
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
        console.log(`WhatsApp message sent successfully for job ${job.id}`);
        await admin.from("reminder_jobs").update({ status: "SENT", last_error: null }).eq("id", job.id);
        // Reflect success on session (last attempt status)
        await admin.from("sessions").update({ whatsapp_notification_status: "SENT", whatsapp_last_error: null }).eq("id", sess.id);
      } else {
        const errText = await resp.text();
        let err;
        try {
          err = JSON.parse(errText);
        } catch {
          err = { message: errText, status: resp.status };
        }
        console.error(`WhatsApp API error for job ${job.id}:`, err);
        await admin
          .from("reminder_jobs")
          .update({ status: "FAILED", last_error: JSON.stringify(err) })
          .eq("id", job.id);
        await admin.from("sessions").update({ whatsapp_notification_status: "FAILED", whatsapp_last_error: JSON.stringify(err) }).eq("id", sess.id);
      }
    }

    console.log(`Completed processing ${jobs.length} jobs`);
    return new Response(JSON.stringify({ processed: jobs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Unhandled error in function:", e);
    console.error("Error stack:", e?.stack);
    return new Response(JSON.stringify({ 
      error: e?.message || "Internal error",
      stack: e?.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


