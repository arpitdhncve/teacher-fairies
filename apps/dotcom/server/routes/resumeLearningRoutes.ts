import express from 'express';
import { resumeLearning } from '../controllers/resumeLearningController';

const router = express.Router();

// POST /resume-learning
router.post('/resume-learning', resumeLearning);

export default router;