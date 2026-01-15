import { Router } from 'express';
import { getCourse } from '../controllers/courseController';

const router = Router();

// GET /course/:courseId
router.get('/course/:courseId', getCourse);

export default router;
