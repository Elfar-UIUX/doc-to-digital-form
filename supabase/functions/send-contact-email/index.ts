// @ts-nocheck
/* eslint-disable */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Gmail SMTP Configuration (Note: SMTP may not work in Supabase Edge Functions due to network restrictions)
const GMAIL_SMTP_USER = Deno.env.get("GMAIL_SMTP_USER") || "";
const GMAIL_SMTP_PASS = Deno.env.get("GMAIL_SMTP_PASS") || "";
const GMAIL_FROM_EMAIL = Deno.env.get("GMAIL_FROM_EMAIL") || GMAIL_SMTP_USER;

// Resend API (Recommended - works with Edge Functions)
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || Deno.env.get("EMAIL_API_KEY") || "";

// SMTP Helper Functions
async function sendEmailViaSMTP(
  to: string,
  subject: string,
  html: string,
  text: string,
  fromEmail: string,
  smtpUser: string,
  smtpPass: string
): Promise<void> {
  const SMTP_HOST = "smtp.gmail.com";
  const SMTP_PORT = 587; // STARTTLS port
  
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Connect to SMTP server (plain connection first)
  let conn: Deno.TcpConn;
  try {
    conn = await Deno.connect({
      hostname: SMTP_HOST,
      port: SMTP_PORT,
    });
    console.log("Connected to SMTP server");
  } catch (error: any) {
    throw new Error(`Failed to connect to SMTP server: ${error.message}`);
  }

  // Helper to read response (handles multi-line SMTP responses)
  const readResponse = async (reader: Deno.Reader): Promise<string> => {
    let response = "";
    const buffer = new Uint8Array(1024);
    let timeoutCount = 0;
    const maxTimeouts = 20; // 20 * 50ms = 1 second max wait
    
    while (timeoutCount < maxTimeouts) {
      const bytesRead = await reader.read(buffer);
      
      if (bytesRead === null || bytesRead === 0) {
        // Check if we already have a complete response
        if (response.includes("\r\n")) {
          const lines = response.split("\r\n");
          const lastLine = lines[lines.length - 1];
          // If we have a line starting with 3 digits and space, we're done
          if (lastLine && /^\d{3} /.test(lastLine)) {
            break;
          }
        }
        // Wait a bit for more data
        await new Promise(resolve => setTimeout(resolve, 50));
        timeoutCount++;
        continue;
      }
      
      const chunk = decoder.decode(buffer.subarray(0, bytesRead));
      response += chunk;
      
      // SMTP responses end with \r\n
      // Multi-line responses have continuation lines starting with space or tab
      // Final line starts with 3 digits followed by space
      if (response.includes("\r\n")) {
        const lines = response.split("\r\n");
        const lastLine = lines[lines.length - 1];
        
        // Check if we have a complete response
        // Response is complete when we have a line starting with 3 digits and space
        // and it's followed by \r\n (or we're at the end)
        if (lastLine && /^\d{3} /.test(lastLine)) {
          // Check if response ends with \r\n or if lastLine is the complete response
          if (response.endsWith("\r\n") || lines.length > 1) {
            break;
          }
        }
      }
      
      // Safety check - don't accumulate too much data
      if (response.length > 8192) {
        break;
      }
      
      timeoutCount = 0; // Reset timeout counter when we get data
    }
    
    if (!response || !response.trim()) {
      throw new Error("No response from SMTP server (timeout)");
    }
    
    // Extract just the status line (first line with 3 digits)
    const lines = response.split("\r\n");
    const statusLine = lines.find(line => /^\d{3} /.test(line)) || lines[0];
    
    return response.trim();
  };

  // Helper to send command and read response
  const sendCommand = async (writer: Deno.Writer, reader: Deno.Reader, command: string): Promise<string> => {
    if (command) {
      await writer.write(encoder.encode(command + "\r\n"));
    }
    return await readResponse(reader);
  };

  // Read initial greeting from server
  console.log("Reading initial greeting...");
  const greeting = await readResponse(conn);
  console.log("Greeting received:", greeting.substring(0, 100));
  if (!greeting.startsWith("220")) {
    conn.close();
    throw new Error(`SMTP greeting failed: ${greeting}`);
  }

  // EHLO (before STARTTLS)
  console.log("Sending EHLO...");
  const ehloResponse = await sendCommand(conn, conn, `EHLO ${SMTP_HOST}`);
  console.log("EHLO response:", ehloResponse.substring(0, 200));
  if (!ehloResponse.startsWith("250")) {
    conn.close();
    throw new Error(`EHLO failed: ${ehloResponse}`);
  }

  // STARTTLS
  console.log("Sending STARTTLS...");
  const starttlsResponse = await sendCommand(conn, conn, "STARTTLS");
  console.log("STARTTLS response:", starttlsResponse);
  if (!starttlsResponse.startsWith("220")) {
    conn.close();
    throw new Error(`STARTTLS failed: ${starttlsResponse}`);
  }

  // Upgrade to TLS
  let tlsConn: Deno.TlsConn;
  try {
    console.log("Upgrading to TLS...");
    // Close the plain connection's read/write before upgrading
    // Note: In Deno, we need to be careful about the connection state
    tlsConn = await Deno.startTls(conn, {
      hostname: SMTP_HOST,
      // Don't verify certificate in case of issues (for development)
      // In production, you might want to verify
    });
    console.log("TLS connection established successfully");
  } catch (error: any) {
    console.error("TLS upgrade error:", error);
    conn.close();
    throw new Error(`Failed to establish TLS connection: ${error.message}. This might be due to network restrictions in Supabase Edge Functions. Consider using a service like Resend instead.`);
  }

  // EHLO again after TLS
  const ehloTlsResponse = await sendCommand(tlsConn, tlsConn, `EHLO ${SMTP_HOST}`);
  if (!ehloTlsResponse.startsWith("250")) {
    tlsConn.close();
    throw new Error(`EHLO after TLS failed: ${ehloTlsResponse}`);
  }

  // AUTH LOGIN
  const authResponse = await sendCommand(tlsConn, tlsConn, "AUTH LOGIN");
  if (!authResponse.startsWith("334")) {
    tlsConn.close();
    throw new Error(`AUTH LOGIN failed: ${authResponse}`);
  }

  // Send username (base64 encoded)
  const usernameB64 = btoa(smtpUser);
  const userResponse = await sendCommand(tlsConn, tlsConn, usernameB64);
  if (!userResponse.startsWith("334")) {
    tlsConn.close();
    throw new Error(`Username auth failed: ${userResponse}`);
  }

  // Send password (base64 encoded)
  const passwordB64 = btoa(smtpPass);
  const passResponse = await sendCommand(tlsConn, tlsConn, passwordB64);
  if (!passResponse.startsWith("235")) {
    tlsConn.close();
    throw new Error(`Password auth failed: ${passResponse}`);
  }

  // MAIL FROM
  const mailFromResponse = await sendCommand(tlsConn, tlsConn, `MAIL FROM:<${fromEmail}>`);
  if (!mailFromResponse.startsWith("250")) {
    tlsConn.close();
    throw new Error(`MAIL FROM failed: ${mailFromResponse}`);
  }

  // RCPT TO
  const rcptToResponse = await sendCommand(tlsConn, tlsConn, `RCPT TO:<${to}>`);
  if (!rcptToResponse.startsWith("250")) {
    tlsConn.close();
    throw new Error(`RCPT TO failed: ${rcptToResponse}`);
  }

  // DATA
  const dataResponse = await sendCommand(tlsConn, tlsConn, "DATA");
  if (!dataResponse.startsWith("354")) {
    tlsConn.close();
    throw new Error(`DATA failed: ${dataResponse}`);
  }

  // Build email message
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const message = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    text,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    html,
    ``,
    `--${boundary}--`,
    `.`,
  ].join("\r\n");

  // Send message
  const messageResponse = await sendCommand(tlsConn, tlsConn, message);
  if (!messageResponse.startsWith("250")) {
    tlsConn.close();
    throw new Error(`Message send failed: ${messageResponse}`);
  }

  // QUIT
  await sendCommand(tlsConn, tlsConn, "QUIT");
  tlsConn.close();
}

serve(async (req) => {
  console.log("send-contact-email function invoked:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Request body received:", { to: body.to, subject: body.subject });
    
    const { to, subject, html, text } = body;

    if (!to || !subject || !html) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check available email services
    console.log("Checking email service credentials...", {
      hasResend: !!RESEND_API_KEY,
      hasSmtpUser: !!GMAIL_SMTP_USER,
      hasSmtpPass: !!GMAIL_SMTP_PASS,
      fromEmail: GMAIL_FROM_EMAIL,
    });

    // Option 1: Use Resend (Recommended - works with Edge Functions)
    if (RESEND_API_KEY) {
      console.log("Using Resend to send email to:", to);
      
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: GMAIL_FROM_EMAIL || "TutorSessions <noreply@tutorsessions.com>",
            to: [to],
            subject: subject,
            html: html,
            text: text,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          throw new Error(`Resend API error: ${errorText}`);
        }

        const data = await resendResponse.json();
        console.log("Email sent successfully via Resend");
        return new Response(JSON.stringify({ success: true, message: "Email sent via Resend", id: data.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error: any) {
        console.error("Resend error:", error);
        // Fall through to try SMTP if available
        if (!GMAIL_SMTP_USER || !GMAIL_SMTP_PASS) {
          return new Response(
            JSON.stringify({ 
              error: `Resend error: ${error.message}. Please check your RESEND_API_KEY.` 
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        console.log("Resend failed, trying SMTP as fallback...");
      }
    }

    // Option 2: Try Gmail SMTP (may not work in Edge Functions due to network restrictions)
    if (GMAIL_SMTP_USER && GMAIL_SMTP_PASS) {
      console.log("Using Gmail SMTP to send email to:", to);
      console.warn("Note: SMTP may not work in Supabase Edge Functions due to network restrictions");
      
      try {
        await sendEmailViaSMTP(
          to,
          subject,
          html,
          text,
          GMAIL_FROM_EMAIL,
          GMAIL_SMTP_USER,
          GMAIL_SMTP_PASS
        );
        
        console.log("Email sent successfully via Gmail SMTP");
        return new Response(JSON.stringify({ success: true, message: "Email sent via Gmail SMTP" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error: any) {
        console.error("Gmail SMTP error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
        
        // Provide helpful error message
        const errorMsg = error.message.includes("InvalidContentType") || error.message.includes("TLS")
          ? "SMTP connections are blocked by Supabase Edge Functions. Please use Resend instead (set RESEND_API_KEY secret)."
          : `Gmail SMTP error: ${error.message}`;
        
        return new Response(
          JSON.stringify({ 
            error: errorMsg,
            suggestion: "Set RESEND_API_KEY secret and use Resend service instead"
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // No email service configured
    console.error("No email service configured");
    return new Response(
      JSON.stringify({ 
        error: "No email service configured. Please set either RESEND_API_KEY (recommended) or GMAIL_SMTP_USER/GMAIL_SMTP_PASS secrets.",
        instructions: "For Resend: Sign up at https://resend.com, get API key, set RESEND_API_KEY secret"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Unhandled error in send-contact-email:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send email",
        details: process.env.DENO_ENV === "development" ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

