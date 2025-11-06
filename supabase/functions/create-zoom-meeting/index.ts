import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ZOOM_API_URL = 'https://api.zoom.us/v2';

// Generate JWT token for Zoom API
async function generateZoomJWT(apiKey: string, apiSecret: string): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload = {
    iss: apiKey,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
  };

  // Base64 URL encode
  const base64UrlEncode = (str: string): string => {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  
  // Use Web Crypto API for HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signatureInput)
  );
  
  const signatureArray = new Uint8Array(signature);
  const signatureEncoded = base64UrlEncode(
    String.fromCharCode(...signatureArray)
  );
  
  return `${signatureInput}.${signatureEncoded}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    // Get user from auth header
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user's Zoom credentials from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('zoom_api_key, zoom_api_secret')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.zoom_api_key || !profile?.zoom_api_secret) {
      return new Response(
        JSON.stringify({ error: 'Zoom credentials not found. Please connect Zoom in Settings.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { start_time, duration, topic } = await req.json();

    if (!start_time || !duration || !topic) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: start_time, duration, topic' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate JWT token for Zoom
    const token = await generateZoomJWT(
      profile.zoom_api_key,
      profile.zoom_api_secret
    );

    // Create Zoom meeting
    const zoomResponse = await fetch(`${ZOOM_API_URL}/users/me/meetings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        type: 2, // Scheduled meeting
        start_time: new Date(start_time).toISOString(),
        duration: duration,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: false,
          watermark: false,
          use_pmi: false,
        },
      }),
    });

    if (!zoomResponse.ok) {
      const errorData = await zoomResponse.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Zoom API error:', errorData);
      
      return new Response(
        JSON.stringify({
          error: errorData.message || `Zoom API error: ${zoomResponse.status}`,
          details: errorData,
        }),
        {
          status: zoomResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const zoomData = await zoomResponse.json();

    return new Response(
      JSON.stringify({
        id: zoomData.id.toString(),
        join_url: zoomData.join_url,
        start_url: zoomData.start_url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

