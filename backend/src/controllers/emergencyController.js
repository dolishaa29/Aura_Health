import { GoogleGenerativeAI } from "@google/generative-ai";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const EMERGENCY_PROMPT = `You are an emergency first-aid assistant for Indian users. The user may share a LIVE camera image and optional speech.

IMPORTANT — ALL text fields shown to the user MUST be in **Hinglish** (natural mix of Hindi + English as people actually speak in India — NOT formal Hindi, NOT pure English). Example tone: "Pehle panic mat karo, seedha pressure lagao bleeding pe, aur 102/112 pe call karo agar zyada blood hai."

Respond with ONLY valid JSON — no markdown:
{
  "severity": "low | moderate | high | critical",
  "situationSummary": "1-2 sentences Hinglish",
  "immediateSteps": ["step in Hinglish", "step in Hinglish"],
  "voiceScript": "3-6 sentences Hinglish — yahi aloud sunaya jayega; calm, clear, abhi kya karna hai",
  "doNotDo": ["Hinglish"],
  "callEmergencyServices": true,
  "disclaimer": "Short Hinglish: yeh medical diagnosis nahi hai."
}

Rules:
- severity/callEmergencyServices: English enum values only (low, moderate, high, critical, true/false).
- Everything else user-facing: Hinglish only.
- Zyada serious bleeding, unconsciousness, breathing problem, major injury ho to callEmergencyServices true aur voiceScript me turant ambulance/112/102 bolna.
- Diagnosis claim mat karo; "lagta hai", "ho sakta hai" use karo.`;

const VOICE_REPLY_PROMPT = `You are an emergency first-aid voice assistant for Indian users. The user speaks in Hindi/Hinglish (may be noisy).

You MUST reply ONLY in **Hinglish** — natural spoken mix (Hindi + English words), like a calm friend explaining first aid. Never reply in full formal English only; never only Sanskrit-heavy Hindi.

Respond with ONLY valid JSON — no markdown:
{
  "voiceScript": "3-8 sentences — yahi TTS se bologe; har nayi baat pe clear steps, agar user ne sawaal pucha to seedha jawab do",
  "textReply": "Same message thoda readable format for screen (Hinglish)",
  "callEmergency": false
}

Rules:
- **Ek hi turn:** Sirf user ke LATEST message ka jawab do. Pehle wala advice repeat mat karo unless user ne specifically repeat karne ko kaha ho.
- Conversation history agar diya ho to sirf context ke liye — naya jawab short aur seedha ho.
- If user asks something unrelated to emergency, politely Hinglish me bolo camera scene pe focus karo ya clearly batao kya hua.
- Agar life-threatening lagta ho (bahut bleeding, saans nahi, behosh) to callEmergency true aur voiceScript me turant emergency number call karne ko bolo.
- Short, conversational — jaise video call pe turn-by-turn baat: pehle suna, phir ek baar clear guidance.`;

export const emergencyGuidance = async (req, res) => {
  try {
    const { imageData, mimeType, transcriptText } = req.body;

    if (!imageData) {
      return res.status(400).json({ message: "imageData is required" });
    }

    const base64Data = imageData.includes(",") ? imageData.split(",")[1] : imageData;

    let detectedMime = mimeType || "image/jpeg";
    if (imageData.startsWith("data:image/png")) detectedMime = "image/png";
    else if (imageData.startsWith("data:image/webp")) detectedMime = "image/webp";
    else if (imageData.startsWith("data:image/jpeg")) detectedMime = "image/jpeg";

    const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const parts = [
      EMERGENCY_PROMPT,
      ...(transcriptText
        ? [{ text: `User ne bola (speech): ${String(transcriptText).slice(0, 2000)}` }]
        : []),
      { inlineData: { data: base64Data, mimeType: detectedMime } }
    ];

    const result = await model.generateContent(parts);
    const rawText = result.response.text();

    let guidance;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      guidance = JSON.parse(cleaned);
    } catch {
      return res.status(422).json({
        message: "Could not parse emergency guidance. Try again with a clearer image."
      });
    }

    return res.status(200).json({ guidance });
  } catch (error) {
    console.error("Emergency guidance error:", error.message);

    if (error.message?.includes("API_KEY")) {
      return res.status(500).json({ message: "Gemini API key is invalid or missing." });
    }
    if (error.message?.includes("SAFETY")) {
      return res.status(422).json({
        message: "Content was blocked. Point camera at the scene for first-aid guidance."
      });
    }

    return res.status(500).json({ message: "Server error during emergency analysis" });
  }
};

export const emergencyVoiceReply = async (req, res) => {
  try {
    const { transcriptText, lastSceneSummary, conversationTurn, conversationSoFar } = req.body;

    const text = String(transcriptText || "").trim();
    if (text.length < 2) {
      return res.status(400).json({ message: "transcriptText is required" });
    }

    const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prior = String(conversationSoFar || "").trim().slice(-2000);

    const contextParts = [
      VOICE_REPLY_PROMPT,
      {
        text: [
          `User ka **LATEST** message (isipe focus): """${text.slice(0, 3500)}"""`,
          prior && prior !== text
            ? `\nPoorani baat-cheet (reference only, do not repeat as your full reply): """${prior}"""`
            : "",
          lastSceneSummary
            ? `\nCamera scene context (short, Hinglish): ${String(lastSceneSummary).slice(0, 800)}`
            : "",
          conversationTurn != null
            ? `\nTurn number (rough): ${conversationTurn}`
            : ""
        ].join("")
      }
    ];

    const result = await model.generateContent(contextParts);
    const rawText = result.response.text();

    let parsed;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(422).json({
        message: "AI reply parse fail — dubara bol ke try karo."
      });
    }

    return res.status(200).json({
      voiceScript: parsed.voiceScript || "",
      textReply: parsed.textReply || parsed.voiceScript || "",
      callEmergency: Boolean(parsed.callEmergency)
    });
  } catch (error) {
    console.error("Emergency voice reply error:", error.message);

    if (error.message?.includes("API_KEY")) {
      return res.status(500).json({ message: "Gemini API key is invalid or missing." });
    }

    return res.status(500).json({ message: "Server error during voice reply" });
  }
};
