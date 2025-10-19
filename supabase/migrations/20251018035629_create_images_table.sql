/*
  # Create Images Table for ImageVault

  1. New Tables
    - `images`
      - `id` (uuid, primary key) - Unique identifier for each image
      - `filename` (text) - Original filename of the uploaded image
      - `url` (text) - S3 URL where the image is stored
      - `tags` (text[]) - Array of searchable tags extracted from filename
      - `created_at` (timestamptz) - Upload timestamp
  
  2. Security
    - Enable RLS on `images` table
    - Add policy for public read access (demo app - all images visible to everyone)
    - Add policy for public insert access (demo app - anyone can upload)
  
  3. Indexes
    - Add GIN index on tags array for efficient search queries
*/

CREATE TABLE IF NOT EXISTS images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  url text NOT NULL,
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view images"
  ON images FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can upload images"
  ON images FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_images_tags ON images USING GIN(tags);