/*
  # Add User Authentication Support

  1. Changes to Existing Tables
    - Add `user_id` column to `images` table
    - Link images to authenticated users
    
  2. Security Updates
    - Update RLS policies to ensure users can only access their own images
    - Add policies for authenticated users to manage their own images
    
  3. Important Notes
    - Existing images will have NULL user_id (orphaned images)
    - New images will be linked to the authenticated user
    - Users can only see, update, and delete their own images
*/

-- Add user_id column to images table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'images' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE images ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS images_user_id_idx ON images(user_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view images" ON images;
DROP POLICY IF EXISTS "Anyone can upload images" ON images;
DROP POLICY IF EXISTS "Anyone can update image filename and tags" ON images;

-- Create new restrictive policies for authenticated users only
CREATE POLICY "Users can view own images"
  ON images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload own images"
  ON images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images"
  ON images FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own images"
  ON images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);