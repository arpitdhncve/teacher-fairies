import { Router } from 'express';
import { getSession, getLatestSessions } from '../controllers/getSessionController';

const router = Router();

// GET /session/history?userID=...&concept_id=...
router.get('/session/history', getLatestSessions);

// GET /session/:sessionId
router.get('/session/:sessionId', getSession);

export default router;
