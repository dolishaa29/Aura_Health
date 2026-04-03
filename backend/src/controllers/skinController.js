import { GoogleGenerativeAI } from "@google/generative-ai";
import { SkinAnalysis } from "../models/SkinAnalysis.js";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SKIN_ANALYSIS_PROMPT = `You are an expert dermatology AI assistant. Analyze the provided skin/body image carefully and respond with ONLY a valid JSON object — no markdown, no text outside the JSON.

Focus on detecting:
1. Skin conditions: rashes, acne, spots, moles, discoloration, dryness, pigmentation
2. Wounds: cuts, bruises, abrasions, burns, blisters
3. Inflammation: redness, swelling, puffiness, irritation

Respond with this exact JSON structure:
{
  "detectedConditions": [
    {
      "name": "Condition name (e.g. Acne Vulgaris, Contact Dermatitis, Bruise)",
      "category": "skin_condition | wound | inflammation | normal",
      "severity": "mild | moderate | severe | none",
      "location": "Where on the visible skin (e.g. forehead, left cheek, arm)",
      "description": "Brief clinical description of what is visible",
      "confidence": "low | medium | high"
    }
  ],
  "overallSkinHealth": "healthy | mild_concern | moderate_concern | urgent",
  "simpleSummary": {
    "english": "2-3 sentence plain English explanation for a patient with no medical background. Be reassuring but honest.",
    "hindi": "2-3 simple Hindi sentences explaining the findings (use common words, avoid jargon)"
  },
  "recommendations": [
    "Actionable recommendations — home care, when to see a doctor, what to avoid"
  ],
  "doctorNotes": "Clinical observations specifically useful for a dermatologist or doctor reviewing this",
  "urgency": "routine | soon | urgent | emergency"
}

Rules:
- If no skin issues are visible, return overallSkinHealth: "healthy" with empty detectedConditions array
- Be conservative — when unsure, use lower confidence and recommend doctor consultation
- Never diagnose definitively — use language like "appears to be", "may indicate"
- If image is not a skin/body photo, explain in simpleSummary and return overallSkinHealth: "healthy"
- urgency "emergency" only for signs of severe infection, deep wounds, or serious conditions`;

export const analyzeSkin = async (req, res) => {
  try {
    const { imageData, mimeType, patientId: bodyPatientId, appointmentId } = req.body;

    if (!imageData) {
      return res.status(400).json({ message: "imageData is required" });
    }

    // Determine patientId — doctor passes patientId, patient uses their own
    const patientId =
      req.user.role === "doctor" ? bodyPatientId || req.user._id : req.user._id;

    // Save with pending status
    const record = await SkinAnalysis.create({
      patientId,
      analyzedBy: req.user._id,
      analyzedByRole: req.user.role,
      imageData,
      status: "pending",
      appointmentId: appointmentId || null
    });

    // Prepare Gemini request
    const base64Data = imageData.includes(",") ? imageData.split(",")[1] : imageData;

    let detectedMime = mimeType || "image/jpeg";
    if (imageData.startsWith("data:image/png")) detectedMime = "image/png";
    else if (imageData.startsWith("data:image/webp")) detectedMime = "image/webp";
    else if (imageData.startsWith("data:image/jpeg")) detectedMime = "image/jpeg";

    const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      SKIN_ANALYSIS_PROMPT,
      { inlineData: { data: base64Data, mimeType: detectedMime } }
    ]);

    const rawText = result.response.text();

    // Parse JSON
    let analysis;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      await SkinAnalysis.findByIdAndUpdate(record._id, { status: "failed" });
      return res.status(422).json({
        message: "AI could not analyze the image. Please upload a clear, well-lit photo."
      });
    }

    // Save analysis
    const updated = await SkinAnalysis.findByIdAndUpdate(
      record._id,
      {
        analysis: { ...analysis, analyzedAt: new Date() },
        status: "analyzed"
      },
      { new: true }
    ).select("-imageData");

    return res.status(201).json({ analysis: updated });
  } catch (error) {
    console.error("Skin analysis error:", error.message);

    if (error.message?.includes("API_KEY")) {
      return res.status(500).json({ message: "Gemini API key is invalid or missing." });
    }
    if (error.message?.includes("SAFETY")) {
      return res.status(422).json({
        message: "Image was blocked by safety filters. Please upload a valid skin photo."
      });
    }

    return res.status(500).json({ message: "Server error during analysis" });
  }
};

// Patient: get their own analyses
export const getMyAnalyses = async (req, res) => {
  try {
    const analyses = await SkinAnalysis.find({ patientId: req.user._id })
      .select("-imageData")
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({ analyses });
  } catch (error) {
    console.error("Get analyses error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Doctor: get analyses for a specific patient
export const getPatientAnalyses = async (req, res) => {
  try {
    const { patientId } = req.params;

    const analyses = await SkinAnalysis.find({ patientId })
      .select("-imageData")
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({ analyses });
  } catch (error) {
    console.error("Get patient analyses error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteAnalysis = async (req, res) => {
  try {
    const { id } = req.params;

    const query =
      req.user.role === "doctor"
        ? { _id: id, analyzedBy: req.user._id }
        : { _id: id, patientId: req.user._id };

    const record = await SkinAnalysis.findOneAndDelete(query);

    if (!record) {
      return res.status(404).json({ message: "Analysis not found" });
    }

    return res.status(200).json({ message: "Analysis deleted" });
  } catch (error) {
    console.error("Delete analysis error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};