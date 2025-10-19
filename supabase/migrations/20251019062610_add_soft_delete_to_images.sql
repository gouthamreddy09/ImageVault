/*
  # Add Soft Delete to Images Table

  1. Changes
    - Add `deleted_at` column to images table (timestamptz, nullable)
    - Add `deleted` boolean column with default false for easier querying
    - Add index on deleted column for performance
  
  2. Security
    - No RLS changes needed - existing policies still apply
  
  3. Notes
    - Soft delete allows users to recover accidentally deleted images
    - Images are not permanently removed from database or S3
    - Deleted images can be filtered out or shown in trash view
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'images' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE images ADD COLUMN deleted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'images' AND column_name = 'deleted'
  ) THEN
    ALTER TABLE images ADD COLUMN deleted boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_images_deleted ON images(deleted);
CREATE INDEX IF NOT EXISTS idx_images_user_deleted ON images(user_id, deleted);