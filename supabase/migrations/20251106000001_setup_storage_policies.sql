-- Create storage policies for ledger-images bucket
-- These policies allow authenticated users to upload, read, update, and delete files

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads to ledger-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ledger-images');

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads from ledger-images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ledger-images');

-- Allow authenticated users to update files
CREATE POLICY "Allow authenticated updates to ledger-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ledger-images');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes from ledger-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ledger-images');

-- If bucket is public, also allow public reads
CREATE POLICY "Allow public reads from ledger-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ledger-images');


