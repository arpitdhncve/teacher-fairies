import express from 'express';
import { snapshotCanvas, getSnapshotCanvas } from '../controllers/snapshotCanvasController.js';

const router = express.Router();

// POST /snapshot-canvas
router.post('/snapshot-canvas', snapshotCanvas);

// GET /get-snapshot-canvas/:uuid
router.get('/get-snapshot-canvas/:uuid', getSnapshotCanvas);

export default router;