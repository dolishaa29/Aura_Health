import { GoogleGenerativeAI } from "@google/generative-ai";
import { MedicalReport } from "../models/MedicalReport.js";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ANALYSIS_PROMPT = `You are an expert medical report analyzer. Analyze the provided medical report (lab results, blood test, radiology report, etc.) and respond with ONLY a valid JSON object — no markdown, no explanation outside the JSON.

The JSON must follow this exact structure:
{
  "keyFindings": [
    {
      "parameter": "Parameter name (e.g. Hemoglobin, Blood Sugar)",
      "value": "Actual value with unit",
      "status": "normal | high | low | critical",
      "normalRange": "Normal reference range"
    }
  ],
  "simpleSummary": {
    "english": "2-3 sentence plain English explanation suitable for a patient with no medical background",
    "hindi": "2-3 sentence simple Hindi explanation (use simple common Hindi words, not medical jargon)"
  },
  "doctorFlags": [
    "List of specific concerns or recommendations the doctor should review"
  ],
  "overallStatus": "normal | attention_needed | critical"
}

Rules:
- Extract ALL measurable parameters you can find
- Flag anything outside normal range
- simpleSummary must be reassuring but honest — avoid alarming language
- doctorFlags should be specific and actionable
- If the document is not a medical report, return overallStatus: "normal" with a simpleSummary explaining you could not find medical data`;

export const uploadAndAnalyzeReport = async (req, res) => {
  try {
    const { fileName, fileType, fileData, mimeType } = req.body;

    if (!fileName || !fileType || !fileData) {
      return res.status(400).json({ message: "fileName, fileType, and fileData are required" });
    }

    if (!["pdf", "image"].includes(fileType)) {
      return res.status(400).json({ message: "fileType must be pdf or image" });
    }


    const report = await MedicalReport.create({
      patientId: req.user._id,
      fileName,
      fileType,
      fileData,
      status: "pending"
    });

    // Extract base64 data (remove data URL prefix if present)
    const base64Data = fileData.includes(",") ? fileData.split(",")[1] : fileData;

    // Detect mime type
    let detectedMime = mimeType || "image/jpeg";
    if (fileType === "pdf") {
      detectedMime = "application/pdf";
    } else if (fileData.startsWith("data:image/png")) {
      detectedMime = "image/png";
    } else if (fileData.startsWith("data:image/webp")) {
      detectedMime = "image/webp";
    } else if (fileData.startsWith("data:image/jpeg") || fileData.startsWith("data:image/jpg")) {
      detectedMime = "image/jpeg";
    }

    
    const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const filePart = {
      inlineData: {
        data: base64Data,
        mimeType: detectedMime
      }
    };

    const result = await model.generateContent([ANALYSIS_PROMPT, filePart]);
    const rawText = result.response.text();

    
    let analysis;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      await MedicalReport.findByIdAndUpdate(report._id, { status: "failed" });
      return res.status(422).json({
        message: "AI could not parse the report. Please try a clearer image or PDF."
      });
    }

    // Save analysis to DB
    const updatedReport = await MedicalReport.findByIdAndUpdate(
      report._id,
      {
        analysis: { ...analysis, analyzedAt: new Date() },
        status: "analyzed"
      },
      { new: true }
    ).select("-fileData"); // Don't return fileData — too large

    return res.status(201).json({ report: updatedReport });
  } catch (error) {
    console.error("Report analysis error:", error.message);

    // Handle Gemini-specific errors
    if (error.message?.includes("API_KEY")) {
      return res.status(500).json({ message: "Gemini API key is invalid or missing." });
    }
    if (error.message?.includes("SAFETY")) {
      return res.status(422).json({ message: "Report was blocked by safety filters. Please upload a valid medical report." });
    }

    return res.status(500).json({ message: "Server error during analysis" });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const reports = await MedicalReport.find({ patientId: req.user._id })
      .select("-fileData")
      .sort({ createdAt: -1 });

    return res.status(200).json({ reports });
  } catch (error) {
    console.error("Get reports error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await MedicalReport.findOne({
      _id: id,
      patientId: req.user._id
    }).select("-fileData");

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    return res.status(200).json({ report });
  } catch (error) {
    console.error("Get report error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await MedicalReport.findOneAndDelete({
      _id: id,
      patientId: req.user._id
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    return res.status(200).json({ message: "Report deleted" });
  } catch (error) {
    console.error("Delete report error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};