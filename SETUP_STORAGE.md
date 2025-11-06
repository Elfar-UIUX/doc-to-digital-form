# Storage Bucket Setup Instructions

## Create the ledger-images Storage Bucket

To enable image uploads for ledger entries, you need to create a storage bucket in Supabase:

### Steps:

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar

3. **Create New Bucket**
   - Click the "New bucket" button
   - Name: `ledger-images`
   - **Important**: Toggle "Public bucket" to **ON** (this makes images accessible via public URLs)
   - Click "Create bucket"

4. **Set Storage Policies (Optional but Recommended)**
   - After creating the bucket, click on it
   - Go to "Policies" tab
   - Add policies to allow authenticated users to upload:
     - **INSERT Policy**: Allow authenticated users to upload files
     - **SELECT Policy**: Allow authenticated users to read files
     - **UPDATE Policy**: Allow authenticated users to update files
     - **DELETE Policy**: Allow authenticated users to delete files

   Or use this SQL in the SQL Editor:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ledger-images');

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ledger-images');

-- Allow authenticated users to update files
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ledger-images');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ledger-images');
```

5. **Verify**
   - After creating the bucket, try uploading an image in the Ledger page
   - The error should disappear and images should upload successfully

### Alternative: Use Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase storage create ledger-images --public
```

Then apply the policies using the SQL above.


