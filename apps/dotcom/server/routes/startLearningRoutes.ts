import express from 'express';
import {
  startLearning,
  // getStartLearningPrompt,
  // getActionPrompt,
  // getUpdateActionPrompt,
} from "../controllers/startLearningController";

const router = express.Router();

// POST /start-learning
router.post('/start-learning', startLearning);

// GET /start-learning-prompt/:sessionUUID
// router.get('/start-learning-prompt/:sessionUUID', getStartLearningPrompt);

// // GET /createActionList
// router.get("/getActionPrompt", getActionPrompt);

// GET /getUpdateActionPrompt
// router.get("/getUpdateActionPrompt", getUpdateActionPrompt);

export default router;