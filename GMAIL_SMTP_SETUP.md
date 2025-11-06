# Gmail SMTP Setup Guide

## Why Gmail SMTP is Complex for Edge Functions

Gmail SMTP requires implementing the SMTP protocol, which is complex in Deno Edge Functions. **We recommend using Resend instead** (free tier available, much easier).

However, if you specifically need Gmail, here are your options:

## Option 1: Use Resend (Recommended - Easiest)

1. **Sign up at https://resend.com** (free tier: 3,000 emails/month)
2. **Get your API key** from the dashboard
3. **Set the secret in Supabase:**
   ```bash
   npx supabase@latest secrets set EMAIL_API_KEY="re_xxxxxxxxxxxx" --project-ref fhctcakemcchymjmeuie
   ```
4. **Done!** The function will automatically use Resend.

## Option 2: Gmail SMTP (More Complex)

### Step 1: Get Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Click **Security** → **2-Step Verification** (enable if not already)
3. Go to **App passwords**: https://myaccount.google.com/apppasswords
4. Select app: **Mail**
5. Select device: **Other (Custom name)** → Enter "TutorSessions"
6. Click **Generate**
7. **Copy the 16-character password** (you'll need this)

### Step 2: Set Secrets in Supabase

```bash
npx supabase@latest secrets set GMAIL_SMTP_USER="your-email@gmail.com" --project-ref fhctcakemcchymjmeuie

npx supabase@latest secrets set GMAIL_SMTP_PASS="your-16-char-app-password" --project-ref fhctcakemcchymjmeuie

npx supabase@latest secrets set GMAIL_FROM_EMAIL="your-email@gmail.com" --project-ref fhctcakemcchymjmeuie
```

### Step 3: Update Function for Gmail SMTP

**Note:** The current function uses Resend. For actual Gmail SMTP, you'd need to:
- Implement SMTP protocol in Deno (complex)
- OR use a service like EmailJS
- OR use Gmail API (requires OAuth)

**Recommendation:** Use Resend - it's free, easier, and works perfectly with Edge Functions.

## Quick Setup with Resend

1. Sign up: https://resend.com/signup
2. Get API key from dashboard
3. Run:
   ```bash
   npx supabase@latest secrets set EMAIL_API_KEY="re_xxxxx" --project-ref fhctcakemcchymjmeuie
   ```
4. Redeploy function:
   ```bash
   npx supabase@latest functions deploy send-contact-email --project-ref fhctcakemcchymjmeuie
   ```

That's it! Emails will be sent to `elfar.uiux@gmail.com` from your Resend account.

