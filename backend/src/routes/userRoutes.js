import express from "express";
import {
  getUsers,
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  createUser,
  deleteUser
} from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { roleMiddleware } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/doctors", roleMiddleware(["admin", "doctor", "patient"]), getDoctors);
router.get("/doctors/:id", roleMiddleware(["admin", "doctor", "patient"]), getDoctorById);
router.post("/doctors", roleMiddleware(["admin"]), createDoctor);
router.patch("/doctors/:id", roleMiddleware(["admin"]), updateDoctor);

router.get("/", roleMiddleware(["admin"]), getUsers);
router.post("/", roleMiddleware(["admin"]), createUser);
router.delete("/:id", roleMiddleware(["admin"]), deleteUser);

export default router;


