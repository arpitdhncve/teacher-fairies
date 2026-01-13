-- Create concept table
CREATE TABLE "concept" (
  "id" TEXT PRIMARY KEY,
  "moduleId" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "conceptUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_module" FOREIGN KEY ("moduleId") REFERENCES "module" ("id") ON DELETE CASCADE,
  CONSTRAINT "concept_module_order_unique" UNIQUE ("moduleId", "orderIndex")
);

CREATE INDEX "concept_moduleId_idx" ON "concept" ("moduleId");

-- Create case_study table
CREATE TABLE "case_study" (
  "id" TEXT PRIMARY KEY,
  "conceptId" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "source" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_concept" FOREIGN KEY ("conceptId") REFERENCES "concept" ("id") ON DELETE CASCADE,
  CONSTRAINT "case_study_concept_order_unique" UNIQUE ("conceptId", "orderIndex")
);

CREATE INDEX "case_study_conceptId_idx" ON "case_study" ("conceptId");

-- Create learning_outcome table
CREATE TABLE "learning_outcome" (
  "id" TEXT PRIMARY KEY,
  "conceptId" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_concept" FOREIGN KEY ("conceptId") REFERENCES "concept" ("id") ON DELETE CASCADE,
  CONSTRAINT "learning_outcome_concept_order_unique" UNIQUE ("conceptId", "orderIndex")
);

CREATE INDEX "learning_outcome_conceptId_idx" ON "learning_outcome" ("conceptId");

-- Create a function to update the updatedAt timestamp for concept table
CREATE OR REPLACE FUNCTION update_concept_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp
CREATE TRIGGER "update_concept_timestamp_trigger"
BEFORE UPDATE ON "concept"
FOR EACH ROW
EXECUTE FUNCTION update_concept_timestamp();
