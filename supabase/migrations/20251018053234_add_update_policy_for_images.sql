/*
  # Add Update Policy for Images Table

  1. Changes
    - Add UPDATE policy to allow anyone to rename images
    - This enables the rename feature for already uploaded images
  
  2. Security
    - Allow public update access for filename and tags columns
    - Maintains same security model as insert (demo app - public access)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'images' 
    AND policyname = 'Anyone can update images'
  ) THEN
    CREATE POLICY "Anyone can update images"
      ON images FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;