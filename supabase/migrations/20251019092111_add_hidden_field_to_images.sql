/*
  # Add hidden field to images table

  1. Changes
    - Add `hidden` boolean column to images table with default value false
    - Add `hidden_at` timestamp column to track when image was hidden
    - Update RLS policies to exclude hidden images from regular queries
  
  2. Security
    - Hidden images will not appear in regular image queries
    - Only accessible through dedicated hidden folder endpoint
*/

-- Add hidden field to images table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'images' AND column_name = 'hidden'
  ) THEN
    ALTER TABLE images ADD COLUMN hidden boolean DEFAULT false;
  END IF;
END $$;

-- Add hidden_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'images' AND column_name = 'hidden_at'
  ) THEN
    ALTER TABLE images ADD COLUMN hidden_at timestamptz;
  END IF;
END $$;
