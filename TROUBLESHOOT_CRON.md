# Troubleshooting WhatsApp Reminders Cron Job

## Issue: Cron job scheduled but not executing

### Step 1: Check if pg_cron scheduler is running

Run this SQL in Supabase SQL Editor:

```sql
SELECT pid, usename, application_name, backend_start, state, query
FROM pg_stat_activity
WHERE application_name ILIKE 'pg_cron%';
```

**Expected:** Should return at least one row with `application_name = 'pg_cron scheduler'` and `state = 'active'`

**If no rows:** The scheduler isn't running. Try:
- Go to Supabase Dashboard → Settings → Infrastructure
- Click "Fast Reboot" to restart the database
- This should restart the pg_cron scheduler

### Step 2: Check cron job execution history

```sql
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = 2
ORDER BY start_time DESC
LIMIT 10;
```

**If empty:** The job has never run. Check the command format.

### Step 3: Verify the command format

The command in your cron job should be a complete SQL statement. Check what's actually stored:

```sql
SELECT jobid, schedule, command, nodename, nodeport, database
FROM cron.job
WHERE jobid = 2;
```

### Step 4: Test the command manually

Try running the HTTP call manually to see if it works:

```sql
SELECT net.http_post(
  url := 'https://fhctcakemcchymjmeuie.supabase.co/functions/v1/send-whatsapp-reminders',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
  ),
  body := '{}'::jsonb
);
```

**If this fails:** The issue is with the HTTP call itself, not the cron.

### Step 5: Check if pg_net extension is enabled

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

**If empty:** Enable it:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 6: Fix the cron job command

The command should be a complete SQL statement. Recreate the job with proper format:

```sql
-- First, remove the existing job
SELECT cron.unschedule('send-whatsapp-reminders');

-- Recreate with proper command format
SELECT cron.schedule(
  'send-whatsapp-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fhctcakemcchymjmeuie.supabase.co/functions/v1/send-whatsapp-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Step 7: Verify Edge Function is deployed and accessible

Test the function directly:

```bash
curl -X POST https://fhctcakemcchymjmeuie.supabase.co/functions/v1/send-whatsapp-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Or use Supabase Dashboard → Edge Functions → send-whatsapp-reminders → Invoke

### Common Issues:

1. **pg_cron scheduler not running** → Fast Reboot database
2. **pg_net extension not enabled** → Enable it with CREATE EXTENSION
3. **Command format incorrect** → Must be complete SQL statement
4. **Function not deployed** → Deploy the function first
5. **Service role key incorrect** → Verify in Settings → API
6. **Function URL incorrect** → Check the exact URL format

### Quick Fix Script:

Run this complete setup:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Remove old job
SELECT cron.unschedule('send-whatsapp-reminders') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-whatsapp-reminders');

-- Create new job (replace YOUR_SERVICE_ROLE_KEY)
SELECT cron.schedule(
  'send-whatsapp-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fhctcakemcchymjmeuie.supabase.co/functions/v1/send-whatsapp-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verify it was created
SELECT * FROM cron.job WHERE jobname = 'send-whatsapp-reminders';
```

