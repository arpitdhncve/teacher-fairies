-- Add lastLearned JSONB column to file table for tracking learning progress
-- Structure: {"page_number": 1, "last_thinking": "..."}
ALTER TABLE "file"
ADD COLUMN "lastLearned" JSONB DEFAULT NULL;
