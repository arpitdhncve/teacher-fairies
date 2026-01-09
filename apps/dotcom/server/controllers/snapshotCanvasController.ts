import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { SimpleShape } from "../../shared/format/SimpleShape";

interface NonActivePageSnapshot {
  page_id: string;
  name: string;
  image: string | null;
}

interface SnapshotCanvasRequest {
  current_editor: {
    page_id: string;
    name: string;
    image: string | null;
  };
  current_editor_shapes: SimpleShape[];
  non_active_pages?: NonActivePageSnapshot[];
  max_x_value: number;
  max_y_value: number;
}

// Response models
interface SnapshotCanvasSuccessResponse {
  status: "success";
  uuid: string;
}

interface SnapshotCanvasErrorResponse {
  status: "error";
  message: string;
}

type SnapshotCanvasResponse =
  | SnapshotCanvasSuccessResponse
  | SnapshotCanvasErrorResponse;

// Response models for get snapshot
interface SnapshotStorageValue {
  current_editor: {
    page_id: string;
    name: string;
    image: string | null;
  };
  current_editor_shapes: SimpleShape[];
  max_x_value: number;
  max_y_value: number;
}

interface GetSnapshotCanvasSuccessResponse {
  status: "success";
  data: SnapshotStorageValue;
}

interface GetSnapshotCanvasErrorResponse {
  status: "error";
  message: string;
}

type GetSnapshotCanvasResponse =
  | GetSnapshotCanvasSuccessResponse
  | GetSnapshotCanvasErrorResponse;

// In-memory storage for snapshots
const snapshots = new Map<string, SnapshotStorageValue>();

export const snapshotCanvas = async (
  req: Request,
  res: Response<SnapshotCanvasResponse>
) => {
  const {
    current_editor,
    current_editor_shapes,
    non_active_pages,
    max_x_value,
    max_y_value,
  }: SnapshotCanvasRequest = req.body;

  if (
    !current_editor ||
    typeof current_editor.page_id !== "string" ||
    typeof current_editor.name !== "string"
  ) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing current editor information" });
  }

  if (typeof max_x_value !== "number" || typeof max_y_value !== "number") {
    return res.status(400).json({
      status: "error",
      message: "Missing or invalid max canvas bounds",
    });
  }

  // Generate a unique UUID
  const uuid = randomUUID();

  try {
    const shapesPayload = Array.isArray(current_editor_shapes)
      ? current_editor_shapes
      : [];

    const nonActivePagesPayload = Array.isArray(non_active_pages)
      ? non_active_pages
          .filter(
            (page): page is NonActivePageSnapshot =>
              !!page &&
              typeof page === "object" &&
              typeof page.page_id === "string" &&
              typeof page.name === "string"
          )
          .map((page) => ({
            page_id: page.page_id,
            name: page.name,
            image: typeof page.image === "string" ? page.image : null,
          }))
      : [];
    // Store the image and shapes in memory
    snapshots.set(uuid, {
      current_editor: {
        page_id: current_editor.page_id,
        name: current_editor.name,
        image: current_editor.image ?? null,
      },
      current_editor_shapes: shapesPayload,
      max_x_value,
      max_y_value,
    });
    // Return the UUID
    return res.json({
      status: "success",
      uuid,
    });
  } catch (error) {
    console.error("Error storing snapshot:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to store snapshot" });
  }
};

export const getSnapshotCanvas = async (
  req: Request,
  res: Response<GetSnapshotCanvasResponse>
) => {
  const { uuid } = req.params;

  try {
    const data = snapshots.get(uuid);
    if (!data) {
      console.log(`[getSnapshotCanvas] No snapshot found for UUID: ${uuid}`);
      return res
        .status(404)
        .json({ status: "error", message: "Snapshot not found" });
    }

    return res.json({
      status: "success",
      data,
    });
  } catch (error) {
    console.error("Error retrieving snapshot:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to retrieve snapshot" });
  }
};
