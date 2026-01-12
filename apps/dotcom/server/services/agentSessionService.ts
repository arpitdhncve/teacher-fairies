
import pool from "../utils/db";

interface SessionParams {
  sessionId: string;
  userId: string;
  conceptId?: string;
}

interface UpdateSessionParams {
  sessionId: string;
  sessionHistory: any;
}

export const createAgentSession = async ({ sessionId, userId, conceptId }: SessionParams) => {
  try {
    await pool.query(
      `INSERT INTO agent_session ("sessionID", "userID", "started_on", "session_history", "concept_id")
       VALUES ($1, $2, NOW(), $3, $4)`,
      [sessionId, userId, JSON.stringify([]), conceptId]
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

export const getAgentSession = async (sessionId: string) => {
  try {
    const result = await pool.query(
      `SELECT * FROM agent_session WHERE "sessionID" = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error("[agentSessionService] Error fetching session:", error);
    throw error;
  }

};

export const getLatestAgentSessions = async (userId: string, conceptId: string, limit: number = 2) => {
  try {
    const result = await pool.query(
      `SELECT * FROM agent_session 
       WHERE "userID" = $1 AND "concept_id" = $2
       ORDER BY "started_on" DESC 
       LIMIT $3`,
      [userId, conceptId, limit]
    );

    return result.rows;
  } catch (error) {
    console.error("[agentSessionService] Error fetching latest sessions:", error);
    throw error;
  }
};

