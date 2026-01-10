import { Router } from 'express';
import {
  createTaskLog,
  updateTaskLog,
  getTaskLogs,
  getTaskLogById,
  getTaskLogsBySession,
} from '../controllers/taskLogsController';

const router = Router();

// Create a new task log
router.post('/task-logs', createTaskLog);

// Update a task log (for completion)
router.put('/task-logs/:id', updateTaskLog);

// Get all task logs
router.get('/task-logs', getTaskLogs);

// Get task log by ID
router.get('/task-logs/:id', getTaskLogById);

// Get task logs by session ID
router.get('/task-logs/session/:sessionId', getTaskLogsBySession);

export default router;
