
import pool from "../utils/db";

interface SessionParams {
  sessionId: string;
  userId: string;
}

interface UpdateSessionParams {
  sessionId: string;
  sessionHistory: any;
}

export const createAgentSession = async ({ sessionId, userId }: SessionParams) => {
  try {
    await pool.query(
      `INSERT INTO agent_session ("sessionID", "userID", "started_on", "session_history")
       VALUES ($1, $2, NOW(), $3)`,
      [sessionId, userId, JSON.stringify([])]
    );
    console.log(`[agentSessionService] Created session ${sessionId} for user ${userId}`);
  } catch (error) {
    console.error("[agentSessionService] Error creating session:", error);
    throw error; // Re-throw to be handled by the controller
  }
};

export const updateAgentSession = async ({ sessionId, sessionHistory }: UpdateSessionParams) => {
  try {
    const result = await pool.query(
      `UPDATE agent_session 
       SET "session_history" = $1, "ended_on" = NOW()
       WHERE "sessionID" = $2`,
      [JSON.stringify(sessionHistory), sessionId]
    );
    
    if (result.rowCount === 0) {
      console.warn(`[agentSessionService] Session ${sessionId} not found or not updated`);
    } else {
      console.log(`[agentSessionService] Updated session ${sessionId}`);
    }
  } catch (error) {
    console.error("[agentSessionService] Error updating session:", error);
    throw error;
  }
};
