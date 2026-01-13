-- Create course table
CREATE TABLE "course" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "idealFor" TEXT,
  "duration" TEXT,
  "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a function to update the updatedAt timestamp for course table
CREATE OR REPLACE FUNCTION update_course_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp
CREATE TRIGGER "update_course_timestamp_trigger"
BEFORE UPDATE ON "course"
FOR EACH ROW
EXECUTE FUNCTION update_course_timestamp();
