import bcrypt from "bcrypt";
import { User } from "../models/User.js";

const SALT_ROUNDS = 10;

// Public directory: no email/phone in listings
const doctorPublicSelect =
  "name specialization designation bio experienceYears consultationFee isOnline createdAt";

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    return res.status(200).json({ users });
  } catch (error) {
    console.error("Get users error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: "doctor" })
      .select(doctorPublicSelect)
      .sort({ name: 1 });
    return res.status(200).json({ doctors });
  } catch (error) {
    console.error("Get doctors error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await User.findOne({ _id: id, role: "doctor" }).select(doctorPublicSelect);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    return res.status(200).json({ doctor });
  } catch (error) {
    console.error("Get doctor error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      specialization,
      designation,
      bio,
      experienceYears,
      consultationFee
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "doctor",
      specialization: specialization?.trim() || "",
      designation: designation?.trim() || "",
      bio: bio?.trim() || "",
      experienceYears:
        experienceYears !== undefined && experienceYears !== "" ? Number(experienceYears) : undefined,
      consultationFee:
        consultationFee !== undefined && consultationFee !== "" ? Number(consultationFee) : undefined
    });

    const safe = await User.findById(user._id).select("-password");
    return res.status(201).json({ message: "Doctor created", doctor: safe });
  } catch (error) {
    console.error("Create doctor error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      password,
      specialization,
      designation,
      bio,
      experienceYears,
      consultationFee
    } = req.body;

    const doctor = await User.findOne({ _id: id, role: "doctor" });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    if (name !== undefined) doctor.name = name.trim();
    if (email !== undefined) {
      const next = email.toLowerCase().trim();
      const clash = await User.findOne({ email: next, _id: { $ne: id } });
      if (clash) {
        return res.status(400).json({ message: "Email already in use" });
      }
      doctor.email = next;
    }
    if (password !== undefined && password.length >= 6) {
      doctor.password = await bcrypt.hash(password, SALT_ROUNDS);
    }
    if (specialization !== undefined) doctor.specialization = specialization.trim();
    if (designation !== undefined) doctor.designation = designation.trim();
    if (bio !== undefined) doctor.bio = bio.trim();
    if (experienceYears !== undefined && experienceYears !== "") {
      doctor.experienceYears = Number(experienceYears);
    }
    if (consultationFee !== undefined && consultationFee !== "") {
      doctor.consultationFee = Number(consultationFee);
    }

    await doctor.save();
    const safe = await User.findById(doctor._id).select("-password");
    return res.status(200).json({ message: "Doctor updated", doctor: safe });
  } catch (error) {
    console.error("Update doctor error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createUser = async (req, res) => {
  return res.status(501).json({
    message: "Use POST /api/users/doctors to add a doctor account (admin only)."
  });
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete admin account" });
    }
    await User.findByIdAndDelete(id);
    return res.status(200).json({ message: "User deleted" });
  } catch (error) {
    console.error("Delete user error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
