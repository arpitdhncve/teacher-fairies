import { Request, Response } from "express";
import { updateAgentSession } from "../services/agentSessionService";

interface UpdateSessionRequest {
  sessionId: string;
  session_history: any[];
}

export const updateSession = async (req: Request, res: Response) => {
  const { sessionId, session_history } = req.body;

  if (!sessionId || !session_history) {
    return res.status(400).json({
      status: "error",
      message: "Missing required fields: sessionId, session_history",
    });
  }

  try {
    await updateAgentSession({
      sessionId,
      sessionHistory: session_history,
    });

    return res.json({
      status: "success",
      message: "Session updated successfully",
    });
  } catch (error) {
    console.error("[updateSession] Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to update session",
    });
  }
};
