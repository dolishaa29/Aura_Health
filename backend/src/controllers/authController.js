import bcrypt from "bcrypt";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { User } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

const SALT_ROUNDS = 10;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidPassword = (p) =>
  typeof p === "string" &&
  p.length >= 8 &&
  /[A-Za-z]/.test(p) &&
  /[0-9]/.test(p);

const publicUserFields = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
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
    const { name, email, password, phone } = req.body;

    if (!name?.trim() || !email?.trim() || !password || !phone?.trim()) {
      return res.status(400).json({
        message: "Name, email, phone and password are required"
      });
    }

    const emailNorm = email.trim().toLowerCase();
    if (!EMAIL_RE.test(emailNorm)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const phoneParsed = parsePhoneNumberFromString(String(phone).trim());
    if (!phoneParsed?.isValid()) {
      return res.status(400).json({
        message: "Enter a valid phone number including country code"
      });
    }
    const phoneE164 = phoneParsed.format("E.164");

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include both letters and numbers"
      });
    }

    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const phoneTaken = await User.findOne({ phone: phoneE164 });
    if (phoneTaken) {
      return res.status(400).json({ message: "This phone number is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Only patients can self-register; doctors/admins are created by admin
    const user = await User.create({
      name: name.trim(),
      email: emailNorm,
      phone: phoneE164,
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

