/*
  # Add Albums and Favorites functionality

  1. New Tables
    - `albums`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text, album name)
      - `description` (text, optional description)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `album_images`
      - `id` (uuid, primary key)
      - `album_id` (uuid, references albums)
      - `image_id` (uuid, references images)
      - `added_at` (timestamptz)
  
  2. Changes to Existing Tables
    - Add `is_favorite` column to `images` table (boolean, default false)
  
  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own albums
    - Add policies for users to view and modify album_images for their albums
    - Users can only favorite their own images
*/

-- Add is_favorite column to images table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'images' AND column_name = 'is_favorite'
  ) THEN
    ALTER TABLE images ADD COLUMN is_favorite boolean DEFAULT false;
  END IF;
END $$;

-- Create albums table
CREATE TABLE IF NOT EXISTS albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own albums"
  ON albums FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own albums"
  ON albums FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own albums"
  ON albums FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own albums"
  ON albums FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create album_images junction table
CREATE TABLE IF NOT EXISTS album_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid REFERENCES albums(id) ON DELETE CASCADE NOT NULL,
  image_id uuid REFERENCES images(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz DEFAULT now(),
  UNIQUE(album_id, image_id)
);

ALTER TABLE album_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view album images for their albums"
  ON album_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_images.album_id
      AND albums.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add images to their albums"
  ON album_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_images.album_id
      AND albums.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove images from their albums"
  ON album_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_images.album_id
      AND albums.user_id = auth.uid()
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);
CREATE INDEX IF NOT EXISTS idx_album_images_album_id ON album_images(album_id);
CREATE INDEX IF NOT EXISTS idx_album_images_image_id ON album_images(image_id);
CREATE INDEX IF NOT EXISTS idx_images_is_favorite ON images(is_favorite);
