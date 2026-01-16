import { Router } from "express";
import {
  updateLearningProgressHandler,
  getLearningProgressHandler,
} from "../controllers/learningProgressController";

const router = Router();

// POST /learning-progress - Update learning progress
router.post("/learning-progress", updateLearningProgressHandler);

// GET /learning-progress - Get learning progress
router.get("/learning-progress", getLearningProgressHandler);

export default router;
