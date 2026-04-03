import express from "express";
import {
  analyzeSkin,
  getMyAnalyses,
  getPatientAnalyses,
  deleteAnalysis
} from "../controllers/skinController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// Both patient and doctor can analyze
router.post("/analyze", roleMiddleware(["patient", "doctor"]), analyzeSkin);

// Patient: their own history
router.get("/mine", roleMiddleware(["patient"]), getMyAnalyses);

// Doctor: view a specific patient's history
router.get("/patient/:patientId", roleMiddleware(["doctor"]), getPatientAnalyses);

// Both can delete their own
router.delete("/:id", roleMiddleware(["patient", "doctor"]), deleteAnalysis);

export default router;