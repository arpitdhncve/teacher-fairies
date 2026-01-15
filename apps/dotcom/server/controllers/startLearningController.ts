import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  createLivekitAccessToken,
  createRoomWithMetadata,
} from "../utils/livekitUtils";
import { createAgentSession } from "../services/agentSessionService";


// ───────────────────────────────────────────────────────────────────────────────
// ESM-friendly __filename / __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: absolute path to ../prompt-image relative to THIS file (works after build)
const PROMPT_IMAGE_DIR = path.resolve(__dirname, "../prompt-image");

// ───────────────────────────────────────────────────────────────────────────────
// Request model
interface ViewportContext {
  isMobile: boolean;
  isCanvasVisible: boolean;
  deviceType: string;
}

interface StartLearningRequest {
  prompt: string;
  userID?: string;
  learning_material_id?: string;
  viewportContext?: ViewportContext;
}

// Response models
interface LivekitData {
  token: string;
  roomName: string;
}

interface StartLearningSuccessResponse {
  status: "success";
  sessionId: string;
  livekit: LivekitData;
}

interface StartLearningErrorResponse {
  status: "error";
  message: string;
}

type StartLearningResponse =
  | StartLearningSuccessResponse
  | StartLearningErrorResponse;

// Response models for get prompt
interface GetPromptSuccessResponse {
  status: "success";
  basePrompt: string;
  promptText: string;
  images: string[];
}

interface GetPromptErrorResponse {
  status: "error";
  message: string;
}

type GetPromptResponse = GetPromptSuccessResponse | GetPromptErrorResponse;

// Response models for createActionList
interface CreateActionListSuccessResponse {
  status: "success";
  system_prompt: string;
}

interface CreateActionListErrorResponse {
  status: "error";
  message: string;
}

type CreateActionListResponse =
  | CreateActionListSuccessResponse
  | CreateActionListErrorResponse;

// In-memory storage for sessions
const sessions = new Map<string, { prompt: string; images?: string[] }>();

export const startLearning = async (
  req: Request,
  res: Response<StartLearningResponse>
) => {
  const { prompt, userID, learning_material_id, viewportContext }: StartLearningRequest = req.body;

  const sessionId = randomUUID();
  const roomName = `lesson_${Date.now()}`;

  const metadata = {
    sessionId,
    userID: userID ?? 'anonymous',
    learningMaterialId: learning_material_id,
    createdAt: new Date().toISOString(),
    viewportContext: viewportContext ? {
      isMobile: viewportContext.isMobile ?? false,
      isCanvasVisible: viewportContext.isCanvasVisible ?? true,
      deviceType: viewportContext.deviceType ?? 'unknown',
    } : {
      isMobile: false,
      isCanvasVisible: true,
      deviceType: 'unknown',
    },
  };

  console.log('[startLearning] Setting room metadata viewportContext:', JSON.stringify(metadata.viewportContext, null, 2));

  try {
    // Load images from ../prompt-image as base64 (no data: prefix)
    const imagesBase64: string[] = [];
    try {
      const entries = await fs.readdir(PROMPT_IMAGE_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp") {
          const filePath = path.join(PROMPT_IMAGE_DIR, entry.name);
          const bytes = await fs.readFile(filePath);
          imagesBase64.push(bytes.toString("base64"));
        }
      }
    } catch (err) {
      console.warn("[startLearning] Could not read prompt-image directory:", err);
    }

    // Store session data in memory
    sessions.set(sessionId, { prompt, images: imagesBase64 });

    // Create room and token
    await createRoomWithMetadata(roomName, metadata);
    const token = await createLivekitAccessToken(roomName, "2", "arpit");

    // Create session record in DB
    await createAgentSession({ 
      sessionId, 
      userId: metadata.userID,
      learningMaterialId: learning_material_id
    });

    return res.json({
      status: "success",
      sessionId,
      livekit: { token, roomName },
    });
  } catch (error) {
    console.error("[startLearning] Error creating room/token:", error);
    return res.status(500).json({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

// export const getStartLearningPrompt = async (
//   req: Request,
//   res: Response<GetPromptResponse>
// ) => {
//   const { sessionUUID } = req.params;

//   try {
//     const session = sessions.get(sessionUUID);
//     if (!session) {
//       return res
//         .status(404)
//         .json({ status: "error", message: "Session not found" });
//     }

//     const basePrompt = getSystemPrompt();
//     const promptText = session.prompt;
//     const images = session.images || [];

//     return res.json({
//       status: "success",
//       basePrompt,
//       promptText,
//       images,
//     });
//   } catch (error) {
//     console.error("[getStartLearningPrompt] Error:", error);
//     return res
//       .status(500)
//       .json({ status: "error", message: "Failed to retrieve prompt" });
//   }
// };

// export const getActionPrompt = async (
//   req: Request,
//   res: Response<CreateActionListResponse>
// ) => {
//   try {
//     const system_prompt = await getActionPlannerPrompt();
//     return res.json({ status: "success", system_prompt });
//   } catch (error) {
//     console.error("[getActionPrompt] Error:", error);
//     return res.status(500).json({
//       status: "error",
//       message: "Failed to retrieve action planner prompt",
//     });
//   }
// };

// export const getUpdateActionPrompt = async (
//   req: Request,
//   res: Response<CreateActionListResponse>
// ) => {
//   try {
//     const system_prompt = await getUpdatedActionsForCanvas();
//     return res.json({ status: "success", system_prompt });
//   } catch (error) {
//     console.error("[getUpdateActionPrompt] Error:", error);
//     return res.status(500).json({
//       status: "error",
//       message: "Failed to retrieve update action prompt",
//     });
//   }
// };
