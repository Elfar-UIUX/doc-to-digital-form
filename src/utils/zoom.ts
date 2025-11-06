import { SignJWT } from 'jose';
import { supabase } from '@/integrations/supabase/client';

export interface ZoomMeeting {
  id: string;
  join_url: string;
  start_url: string;
}

/**
 * Generates a JWT token for Zoom API authentication
 */
async function generateZoomJWT(apiKey: string, apiSecret: string): Promise<string> {
  const secret = new TextEncoder().encode(apiSecret);
  
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(apiKey)
    .setExpirationTime('1h')
    .sign(secret);

  return jwt;
}

/**
 * Creates a Zoom meeting using JWT authentication
 */
export async function createZoomMeeting(
  apiKey: string,
  apiSecret: string,
  startTime: string,
  duration: number,
  topic: string
): Promise<ZoomMeeting> {
  try {
    // Generate JWT token
    const token = await generateZoomJWT(apiKey, apiSecret);

    // Create meeting via Zoom API
    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        type: 2, // Scheduled meeting
        start_time: new Date(startTime).toISOString(),
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

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Zoom API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      id: data.id.toString(),
      join_url: data.join_url,
      start_url: data.start_url,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create Zoom meeting');
  }
}

/**
 * Creates a Zoom meeting using stored credentials in profile
 */
export async function createZoomMeetingWithProfile(
  startTime: string,
  duration: number,
  topic: string
): Promise<ZoomMeeting | null> {
  // Get user profile with Zoom credentials
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('zoom_api_key, zoom_api_secret')
    .eq('id', user.id)
    .single();

  if (error || !profile?.zoom_api_key || !profile?.zoom_api_secret) {
    return null;
  }

  try {
    return await createZoomMeeting(
      profile.zoom_api_key,
      profile.zoom_api_secret,
      startTime,
      duration,
      topic
    );
  } catch (error) {
    return null;
  }
}
