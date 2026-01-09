import { Request, Response } from "express";
import { createLivekitAccessToken } from "../utils/livekitUtils";

export const resumeLearning = async (req: Request, res: Response) => {
  const { roomName } = req.body;

  if (!roomName) {
    return res.status(400).json({
      status: "error",
      message: "roomName is required"
    });
  }

  try {
    // Create token to join existing room
    const token = await createLivekitAccessToken(roomName, "2", "arpit");

    // Send everything frontend needs
    return res.json({
      status: "success",
      livekit: {
        token,
        roomName,
      },
    });
  } catch (error) {
    console.error("Error creating token:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to resume learning session" });
  }
};