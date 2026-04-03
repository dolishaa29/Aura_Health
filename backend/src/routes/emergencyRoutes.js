import express from "express";
import { emergencyGuidance, emergencyVoiceReply } from "../controllers/emergencyController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(["patient", "doctor"]));

router.post("/guidance", emergencyGuidance);
router.post("/voice-reply", emergencyVoiceReply);

export default router;
