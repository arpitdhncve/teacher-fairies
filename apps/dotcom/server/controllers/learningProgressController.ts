import { Request, Response } from "express";
import {
  updateLearningProgress,
  getLearningProgress,
  LastLearnedData,
} from "../services/learningProgressService";

interface UpdateLearningProgressRequest {
  userId: string;
  createSource: string;
  lastLearned: LastLearnedData;
}

interface GetLearningProgressRequest {
  userId: string;
  createSource: string;
}

/**
 * POST /learning-progress
 * Update the learning progress (page_number, last_thinking) for a user's learning file
 */
export const updateLearningProgressHandler = async (
  req: Request,
  res: Response
) => {
  const { userId, createSource, lastLearned }: UpdateLearningProgressRequest = req.body;

  // Validate required fields
  if (!userId || !createSource) {
    return res.status(400).json({
      status: "error",
      message: "Missing required fields: userId, createSource",
    });
  }

  if (!lastLearned || typeof lastLearned !== "object") {
    return res.status(400).json({
      status: "error",
      message: "lastLearned object is required",
    });
  }

  // Validate page_number if provided
  if (lastLearned.page_number !== undefined && typeof lastLearned.page_number !== "number") {
    return res.status(400).json({
      status: "error",
      message: "page_number must be a number if provided",
    });
  }

  try {
    const updated = await updateLearningProgress({
      userId,
      createSource,
      lastLearned,
    });

    if (!updated) {
      return res.status(404).json({
        status: "error",
        message: "File not found for the given userId and createSource",
      });
    }

    return res.json({
      status: "success",
      message: "Learning progress updated",
    });
  } catch (error) {
    console.error("[learningProgressController] Error:", error);
    return res.status(500).json({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * GET /learning-progress?userId=...&createSource=...
 * Get the learning progress for a user's learning file
 */
export const getLearningProgressHandler = async (
  req: Request,
  res: Response
) => {
  const userId = req.query.userId as string | undefined;
  const createSource = req.query.createSource as string | undefined;

  if (!userId || !createSource) {
    return res.status(400).json({
      status: "error",
      message: "Missing required query params: userId, createSource",
    });
  }

  try {
    const lastLearned = await getLearningProgress({ userId, createSource });

    return res.json({
      status: "success",
      lastLearned: lastLearned ?? { page_number: 1 },
    });
  } catch (error) {
    console.error("[learningProgressController] Error:", error);
    return res.status(500).json({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
