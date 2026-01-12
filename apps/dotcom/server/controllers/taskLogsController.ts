import { Request, Response } from 'express';
import pool from '../utils/db';

// Create or update a task log
export const createTaskLog = async (req: Request, res: Response) => {
  try {
    const {
      id,
      sessionId,
      taskId,
      taskTitle,
      taskDescription,
      taskPrompt,
      status,
      canvasStateBefore,
      canvasScreenshotBefore,
      projectId,
      agentId,
      modelUsed,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO fairy_task_logs (
        "id", "sessionId", "taskId", "taskTitle", "taskDescription", "taskPrompt",
        "status", "canvasStateBefore", "canvasScreenshotBefore", "projectId", "agentId", "modelUsed", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *`,
      [
        id,
        sessionId || null,
        taskId,
        taskTitle || null,
        taskDescription || null,
        taskPrompt || null,
        status || 'in-progress',
        canvasStateBefore ? JSON.stringify(canvasStateBefore) : null,
        canvasScreenshotBefore || null,
        projectId || null,
        agentId || null,
        modelUsed || null,
      ]
    );

    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    console.error('[TaskLogs] Error creating task log:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create task log' });
  }
};

// Update task log with completion data
export const updateTaskLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      canvasStateAfter,
      canvasScreenshotAfter,
      prompt,
      output,
    } = req.body;

    const result = await pool.query(
      `UPDATE fairy_task_logs SET
        "status" = COALESCE($2, "status"),
        "canvasStateAfter" = COALESCE($3, "canvasStateAfter"),
        "canvasScreenshotAfter" = COALESCE($4, "canvasScreenshotAfter"),
        "prompt" = COALESCE($5, "prompt"),
        "output" = COALESCE($6, "output"),
        "completedAt" = CASE WHEN $2 = 'done' THEN NOW() ELSE "completedAt" END
      WHERE "id" = $1
      RETURNING *`,
      [
        id,
        status || null,
        canvasStateAfter ? JSON.stringify(canvasStateAfter) : null,
        canvasScreenshotAfter || null,
        prompt ? JSON.stringify(prompt) : null,
        output ? JSON.stringify(output) : null,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Task log not found' });
    }

    res.json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    console.error('[TaskLogs] Error updating task log:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update task log' });
  }
};

// Get all task logs
export const getTaskLogs = async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await pool.query(
      `SELECT * FROM fairy_task_logs 
       ORDER BY "createdAt" DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    console.error('[TaskLogs] Error fetching task logs:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch task logs' });
  }
};

// Get task log by ID
export const getTaskLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM fairy_task_logs WHERE "id" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Task log not found' });
    }

    res.json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    console.error('[TaskLogs] Error fetching task log:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch task log' });
  }
};

// Get task logs by session ID
export const getTaskLogsBySession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM fairy_task_logs 
       WHERE "sessionId" = $1 
       ORDER BY "createdAt" DESC`,
      [sessionId]
    );

    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    console.error('[TaskLogs] Error fetching task logs by session:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch task logs' });
  }
};
