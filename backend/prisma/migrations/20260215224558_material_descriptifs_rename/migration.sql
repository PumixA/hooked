-- Adjust material descriptif fields
-- - Remove lot_number
-- - Rename dye_lot -> color_number
-- - Rename remaining_meters -> yardage_meters
-- - Add grammage_grams

ALTER TABLE "materials"
  DROP COLUMN IF EXISTS "lot_number";

ALTER TABLE "materials"
  RENAME COLUMN "dye_lot" TO "color_number";

ALTER TABLE "materials"
  RENAME COLUMN "remaining_meters" TO "yardage_meters";

ALTER TABLE "materials"
  ADD COLUMN IF NOT EXISTS "grammage_grams" INTEGER;
