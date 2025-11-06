/**
 * Setup script to create the ledger-images storage bucket
 * 
 * Run this script once to set up the storage bucket:
 * 
 * Option 1: Using Supabase CLI (Recommended)
 *   supabase storage create ledger-images --public
 * 
 * Option 2: Using this script
 *   - Set your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 *   - Run: npx tsx scripts/setup-storage.ts
 * 
 * Option 3: Manual setup via Supabase Dashboard
 *   - See SETUP_STORAGE.md for instructions
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  console.error('Please set these in your .env file or environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupStorage() {
  const bucketName = 'ledger-images';

  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError.message);
      return;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

    if (bucketExists) {
      console.log(`✅ Bucket "${bucketName}" already exists!`);
      return;
    }

    // Create the bucket
    console.log(`Creating bucket "${bucketName}"...`);
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    });

    if (error) {
      console.error('Error creating bucket:', error.message);
      console.error('\nPlease create the bucket manually in the Supabase Dashboard:');
      console.error('1. Go to Storage → New bucket');
      console.error(`2. Name: ${bucketName}`);
      console.error('3. Toggle "Public bucket" to ON');
      console.error('4. Click "Create bucket"');
      return;
    }

    console.log(`✅ Successfully created bucket "${bucketName}"!`);
    console.log('\nBucket is ready for image uploads.');
    
  } catch (error: any) {
    console.error('Unexpected error:', error.message);
  }
}

setupStorage();


