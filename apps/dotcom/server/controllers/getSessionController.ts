import { Request, Response } from "express";
import { getAgentSession, getLatestAgentSessions } from "../services/agentSessionService";

export const getLatestSessions = async (req: Request, res: Response) => {
  const { userID, learning_material_id } = req.query;

  if (!userID || !learning_material_id) {
    return res.status(400).json({
      status: "error",
      message: "Missing required query parameters: userID, learning_material_id",
    });
  }

  try {
    const sessions = await getLatestAgentSessions(userID as string, learning_material_id as string, 2);
    return res.json({
      status: "success",
      sessions,
    });
  } catch (error) {
    console.error("[getLatestSessions] Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch session history",
    });
  }
};


export const getSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({
      status: "error",
      message: "Missing required field: sessionId",
    });
  }

  try {
    const session = await getAgentSession(sessionId);

    if (!session) {
      return res.status(404).json({
        status: "error",
        message: "Session not found",
      });
    }

    return res.json({
      status: "success",
      session,
    });
  } catch (error) {
    console.error("[getSession] Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch session",
    });
  }
};
