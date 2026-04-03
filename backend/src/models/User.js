import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    role: {
      type: String,
      enum: ["doctor", "patient", "admin"],
      default: "patient"
    },
    specialization: {
      type: String,
      trim: true
    },
    designation: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    experienceYears: {
      type: Number,
      min: 0,
      max: 80
    },
    consultationFee: {
      type: Number,
      min: 0
    },
    isOnline: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

userSchema.index({ email: 1 });

export const User = mongoose.model("User", userSchema);
