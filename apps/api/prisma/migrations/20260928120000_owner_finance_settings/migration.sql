ALTER TABLE "CanteenSetting"
ADD COLUMN "expenses" JSONB NOT NULL DEFAULT '[]'::jsonb;
