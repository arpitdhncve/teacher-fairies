import dotenv from "dotenv";
dotenv.config();
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
const LIVEKIT_API_URL = process.env.LIVEKIT_API_URL!;

const roomService = new RoomServiceClient(
  LIVEKIT_API_URL,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET
);

// Create room with metadata
export async function createRoomWithMetadata(
  roomName: string,
  metadata: Record<string, unknown>
) {
  try {
    // Try to create room (if already exists, this will throw — you can ignore)
    const room = await roomService.createRoom({
      name: roomName,
      metadata: JSON.stringify(metadata),
      emptyTimeout: 300, // auto-delete if empty for 5 min
      departureTimeout: 120,
    });
    return room;
  } catch (err: any) {
    if (err.message?.includes("already exists")) {
      console.log("Room already exists, updating metadata");
      await roomService.updateRoomMetadata(roomName, JSON.stringify(metadata));
    }
    throw err;
  }
}

export async function createLivekitAccessToken(
  roomName: string,
  identity?: string,
  name?: string
): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: identity, // REQUIRED
    name: name ?? "Learner", // optional, shows in UI
    ttl: "10m",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  return at.toJwt();
}
