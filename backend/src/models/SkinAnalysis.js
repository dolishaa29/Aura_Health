import mongoose from "mongoose";

const skinAnalysisSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    analyzedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    analyzedByRole: {
      type: String,
      enum: ["patient", "doctor"],
      required: true
    },
    imageData: {
      type: String // base64 — stored temporarily, can be purged
    },
    analysis: {
      detectedConditions: [
        {
          name: String,
          category: {
            type: String,
            enum: ["skin_condition", "wound", "inflammation", "normal"]
          },
          severity: {
            type: String,
            enum: ["mild", "moderate", "severe", "none"]
          },
          location: String,
          description: String,
          confidence: {
            type: String,
            enum: ["low", "medium", "high"]
          }
        }
      ],
      overallSkinHealth: {
        type: String,
        enum: ["healthy", "mild_concern", "moderate_concern", "urgent"]
      },
      simpleSummary: {
        english: String,
        hindi: String
      },
      recommendations: [String],
      doctorNotes: String,
      urgency: {
        type: String,
        enum: ["routine", "soon", "urgent", "emergency"],
        default: "routine"
      },
      analyzedAt: Date
    },
    status: {
      type: String,
      enum: ["pending", "analyzed", "failed"],
      default: "pending"
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null
    }
  },
  { timestamps: true }
);

skinAnalysisSchema.index({ patientId: 1, createdAt: -1 });
skinAnalysisSchema.index({ analyzedBy: 1, createdAt: -1 });

export const SkinAnalysis = mongoose.model("SkinAnalysis", skinAnalysisSchema);