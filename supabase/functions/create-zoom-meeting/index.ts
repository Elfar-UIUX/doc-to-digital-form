import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ZOOM_API_URL = 'https://api.zoom.us/v2';
const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Get OAuth access token from Zoom using Server-to-Server OAuth
 */
async function getZoomAccessToken(
  clientId: string,
  clientSecret: string,
  accountId: string
): Promise<string> {
  // Create Basic Auth header (Client ID:Client Secret base64 encoded)
  const credentials = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(ZOOM_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: accountId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to get Zoom access token: ${error.error || error.message || response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with auth header from request
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    // Get the authorization header - Supabase functions.invoke() passes it automatically
    const authHeader = req.headers.get('Authorization');
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader || '',
        },
      },
      auth: {
        persistSession: false,
      },
    });

    // Get user from auth header
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          details: authError?.message || 'User not found. Please ensure you are logged in.',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user's Zoom OAuth credentials from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('zoom_api_key, zoom_api_secret, zoom_account_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.zoom_api_key || !profile?.zoom_api_secret || !profile?.zoom_account_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Zoom credentials not found. Please connect Zoom in Settings.',
          details: 'Missing Client ID, Client Secret, or Account ID'
        }),
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

    // Get OAuth access token from Zoom
    const accessToken = await getZoomAccessToken(
      profile.zoom_api_key,
      profile.zoom_api_secret,
      profile.zoom_account_id
    );

    // Create Zoom meeting using OAuth access token
    const zoomResponse = await fetch(`${ZOOM_API_URL}/users/me/meetings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
