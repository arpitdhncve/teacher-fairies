-- Fairy Task Logs table for tracking follower fairy (drone) task execution
-- Only logs drone tasks, not leader/orchestrator tasks
-- This migration creates the table if it doesn't exist and adds all required columns

-- Create the fairy_task_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS fairy_task_logs (
    "id" TEXT PRIMARY KEY,
    "sessionId" TEXT,
    "taskId" TEXT,
    "taskTitle" TEXT,
    "taskDescription" TEXT,
    "taskPrompt" TEXT,
    "status" TEXT DEFAULT 'in-progress',
    "canvasStateBefore" JSONB,
    "canvasScreenshotBefore" TEXT,
    "canvasStateAfter" JSONB,
    "canvasScreenshotAfter" TEXT,
    "prompt" JSONB,
    "output" JSONB,
    "projectId" TEXT,
    "agentId" TEXT,
    "modelUsed" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "completedAt" TIMESTAMPTZ
);

-- Add any missing columns to existing table (for backwards compatibility)
DO $$ 
BEGIN
    -- Add sessionId column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'sessionId') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "sessionId" TEXT;
    END IF;
    
    -- Add taskId column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'taskId') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "taskId" TEXT;
    END IF;
    
    -- Add taskTitle column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'taskTitle') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "taskTitle" TEXT;
    END IF;
    
    -- Add taskDescription column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'taskDescription') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "taskDescription" TEXT;
    END IF;
    
    -- Add taskPrompt column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'taskPrompt') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "taskPrompt" TEXT;
    END IF;
    
    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'status') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "status" TEXT DEFAULT 'in-progress';
    END IF;
    
    -- Add canvasStateBefore column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'canvasStateBefore') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "canvasStateBefore" JSONB;
    END IF;
    
    -- Add canvasScreenshotBefore column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'canvasScreenshotBefore') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "canvasScreenshotBefore" TEXT;
    END IF;
    
    -- Add canvasStateAfter column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'canvasStateAfter') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "canvasStateAfter" JSONB;
    END IF;
    
    -- Add canvasScreenshotAfter column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'canvasScreenshotAfter') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "canvasScreenshotAfter" TEXT;
    END IF;
    
    -- Add prompt column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'prompt') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "prompt" JSONB;
    END IF;
    
    -- Add output column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'output') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "output" JSONB;
    END IF;
    
    -- Add projectId column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'projectId') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "projectId" TEXT;
    END IF;
    
    -- Add agentId column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'agentId') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "agentId" TEXT;
    END IF;
    
    -- Add modelUsed column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'modelUsed') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "modelUsed" TEXT;
    END IF;
    
    -- Add createdAt column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'createdAt') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "createdAt" TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add completedAt column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'completedAt') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "completedAt" TIMESTAMPTZ;
    END IF;
END $$;

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_fairy_task_logs_session ON fairy_task_logs("sessionId");
CREATE INDEX IF NOT EXISTS idx_fairy_task_logs_task ON fairy_task_logs("taskId");
CREATE INDEX IF NOT EXISTS idx_fairy_task_logs_project ON fairy_task_logs("projectId");
CREATE INDEX IF NOT EXISTS idx_fairy_task_logs_created ON fairy_task_logs("createdAt");
CREATE INDEX IF NOT EXISTS idx_fairy_task_logs_status ON fairy_task_logs("status");
