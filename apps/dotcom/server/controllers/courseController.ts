import { Request, Response } from "express";
import { getCourseWithCurriculum } from "../services/courseService";

/**
 * Course Controller
 * Single responsibility: Handle HTTP requests for course data
 */

export const getCourse = async (req: Request, res: Response) => {
  const { courseId } = req.params;

  if (!courseId) {
    return res.status(400).json({
      status: "error",
      message: "Missing required parameter: courseId",
    });
  }

  try {
    const course = await getCourseWithCurriculum(courseId);

    if (!course) {
      return res.status(404).json({
        status: "error",
        message: "Course not found",
      });
    }

    return res.json({
      status: "success",
      course,
    });
  } catch (error) {
    console.error("[getCourse] Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch course",
    });
  }
};
