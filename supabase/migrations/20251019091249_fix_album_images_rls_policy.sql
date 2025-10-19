/*
  # Fix album_images RLS policy

  1. Changes
    - Update the RLS policy for inserting into album_images
    - The policy needs to verify both the album ownership AND that the user owns the images being added
  
  2. Security
    - Users can only add their own images to their own albums
    - Prevents users from adding other users' images to albums
*/

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can add images to their albums" ON album_images;

-- Create a better insert policy that checks both album and image ownership
CREATE POLICY "Users can add images to their albums"
  ON album_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_images.album_id
      AND albums.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM images
      WHERE images.id = album_images.image_id
      AND images.user_id = auth.uid()
    )
  );
