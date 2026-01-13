-- Create module table
CREATE TABLE "module" (
  "id" TEXT PRIMARY KEY,
  "courseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_course" FOREIGN KEY ("courseId") REFERENCES "course" ("id") ON DELETE CASCADE
);

-- Create index on courseId for faster lookups
CREATE INDEX "module_courseId_idx" ON "module" ("courseId");

-- Create a function to update the updatedAt timestamp for module table
CREATE OR REPLACE FUNCTION update_module_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp
CREATE TRIGGER "update_module_timestamp_trigger"
BEFORE UPDATE ON "module"
FOR EACH ROW
EXECUTE FUNCTION update_module_timestamp();
