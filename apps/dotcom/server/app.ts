import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import startLearningRoutes from "./routes/startLearningRoutes";
import resumeLearningRoutes from "./routes/resumeLearningRoutes";
import snapshotCanvasRoutes from "./routes/snapshotCanvasRoutes";
import taskLogsRoutes from "./routes/taskLogsRoutes";

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" })); // ⬅️ Add this limit
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true })); // ⬅️ Add this too

// Routes
app.use("/", startLearningRoutes);
app.use("/", resumeLearningRoutes);
app.use("/", snapshotCanvasRoutes);
app.use("/", taskLogsRoutes);

export default app;

