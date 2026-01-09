CREATE TABLE IF NOT EXISTS agent_session (
    "sessionID" TEXT PRIMARY KEY,
    "userID" TEXT NOT NULL,
    "started_on" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "ended_on" TIMESTAMP WITH TIME ZONE,
    "session_history" JSONB
);

CREATE INDEX IF NOT EXISTS idx_agent_session_user ON agent_session("userID");
