ALTER TABLE "projects"
ADD COLUMN "project_steps" JSONB,
ADD COLUMN "active_step_index" INTEGER NOT NULL DEFAULT 0;
