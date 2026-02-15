-- Add optional descriptive fields for materials (inventory)
ALTER TABLE "materials"
  ADD COLUMN IF NOT EXISTS "lot_number" VARCHAR(60),
  ADD COLUMN IF NOT EXISTS "dye_lot" VARCHAR(60),
  ADD COLUMN IF NOT EXISTS "remaining_meters" INTEGER;
