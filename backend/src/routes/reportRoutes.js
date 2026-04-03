import express from "express";
import {
  uploadAndAnalyzeReport,
  getMyReports,
  getReportById,
  deleteReport
} from "../controllers/ReportController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(["patient"]));

router.post("/analyze", uploadAndAnalyzeReport);
router.get("/", getMyReports);
router.get("/:id", getReportById);
router.delete("/:id", deleteReport);

export default router;