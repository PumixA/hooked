-- Add free-text description to materials
ALTER TABLE "materials"
  ADD COLUMN IF NOT EXISTS "description" TEXT;
