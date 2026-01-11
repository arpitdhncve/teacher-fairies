-- Fairy Task Logs table for tracking follower fairy (drone) task execution
-- Only logs drone tasks, not leader/orchestrator tasks
-- This migration updates an existing table to add missing columns

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add taskId column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'taskId') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "taskId" TEXT;
    END IF;
    
    -- Add taskPrompt column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fairy_task_logs' AND column_name = 'taskPrompt') THEN
        ALTER TABLE fairy_task_logs ADD COLUMN "taskPrompt" TEXT;
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
END $$;

-- Create index on taskId if not exists
CREATE INDEX IF NOT EXISTS idx_fairy_task_logs_task ON fairy_task_logs("taskId");
CREATE INDEX IF NOT EXISTS idx_fairy_task_logs_project ON fairy_task_logs("projectId");
