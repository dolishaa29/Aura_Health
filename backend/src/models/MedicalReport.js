import mongoose from "mongoose";

const medicalReportSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      enum: ["pdf", "image"],
      required: true
    },
    fileData: {
      type: String, // base64 encoded
      required: true
    },
    analysis: {
      keyFindings: [
        {
          parameter: String,
          value: String,
          status: {
            type: String,
            enum: ["normal", "high", "low", "critical"]
          },
          normalRange: String
        }
      ],
      simpleSummary: {
        english: String,
        hindi: String
      },
      doctorFlags: [String],
      overallStatus: {
        type: String,
        enum: ["normal", "attention_needed", "critical"],
        default: "normal"
      },
      analyzedAt: Date
    },
    status: {
      type: String,
      enum: ["pending", "analyzed", "failed"],
      default: "pending"
    }
  },
  { timestamps: true }
);

medicalReportSchema.index({ patientId: 1, createdAt: -1 });

export const MedicalReport = mongoose.model("MedicalReport", medicalReportSchema);