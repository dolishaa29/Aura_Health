import bcrypt from "bcrypt";
import { User } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

const SALT_ROUNDS = 10;

const publicUserFields = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  specialization: user.specialization,
  designation: user.designation,
  bio: user.bio,
  experienceYears: user.experienceYears,
  consultationFee: user.consultationFee,
  isOnline: user.isOnline
});

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Only patients can self-register; doctors/admins are created by admin
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "patient"
    });

    const token = generateToken(user);

    if (process.env.JWT_COOKIE === "true") {
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
      });
    }

    return res.status(201).json({
      message: "User registered successfully",
      user: publicUserFields(user),
      token: process.env.JWT_COOKIE === "true" ? undefined : token
    });
  } catch (error) {
    console.error("Register error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    if (process.env.JWT_COOKIE === "true") {
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
      });
    }

    return res.status(200).json({
      message: "Logged in successfully",
      user: publicUserFields(user),
      token: process.env.JWT_COOKIE === "true" ? undefined : token
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const me = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    return res.status(200).json({
      user: publicUserFields(req.user)
    });
  } catch (error) {
    console.error("Me error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const logout = async (req, res) => {
  try {
    if (process.env.JWT_COOKIE === "true") {
      res.clearCookie("token");
    }
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

