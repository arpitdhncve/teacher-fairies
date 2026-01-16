import pool from "../utils/db";

export interface LastLearnedData {
  page_number: number;
  last_thinking?: any;
}

interface UpdateLearningProgressParams {
  userId: string;
  createSource: string;
  lastLearned: LastLearnedData;
}

interface GetLearningProgressParams {
  userId: string;
  createSource: string;
}

/**
 * Update the lastLearned field for a file identified by ownerId and createSource
 */
export const updateLearningProgress = async ({
  userId,
  createSource,
  lastLearned,
}: UpdateLearningProgressParams): Promise<boolean> => {
  try {
    const result = await pool.query(
      `UPDATE file 
       SET "lastLearned" = $1
       WHERE "ownerId" = $2 AND "createSource" = $3`,
      [JSON.stringify(lastLearned), userId, createSource]
    );

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error("[learningProgressService] Error updating learning progress:", error);
    throw error;
  }
};

/**
 * Get the lastLearned field for a file identified by ownerId and createSource
 */
export const getLearningProgress = async ({
  userId,
  createSource,
}: GetLearningProgressParams): Promise<LastLearnedData | null> => {
  try {
    const result = await pool.query(
      `SELECT "lastLearned" FROM file 
       WHERE "ownerId" = $1 AND "createSource" = $2`,
      [userId, createSource]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].lastLearned;
  } catch (error) {
    console.error("[learningProgressService] Error getting learning progress:", error);
    throw error;
  }
};
