import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";

// ─── Constants ────────────────────────────────────────────────
const URGENCY_CONFIG = {
  routine:   { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30", label: "Routine" },
  soon:      { color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/30",     label: "See Doctor Soon" },
  urgent:    { color: "text-orange-400",  bg: "bg-orange-400/10 border-orange-400/30",   label: "Urgent" },
  emergency: { color: "text-red-400",     bg: "bg-red-400/10 border-red-400/30",         label: "Emergency" }
};

const SEVERITY_CONFIG = {
  none:     { color: "text-slate-400",   bg: "bg-slate-700/50 border-slate-600/40",      label: "None" },
  mild:     { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30",  label: "Mild" },
  moderate: { color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/30",      label: "Moderate" },
  severe:   { color: "text-red-400",     bg: "bg-red-400/10 border-red-400/30",          label: "Severe" }
};

const HEALTH_CONFIG = {
  healthy:           { color: "text-emerald-400", label: "Healthy" },
  mild_concern:      { color: "text-amber-400",   label: "Mild Concern" },
  moderate_concern:  { color: "text-orange-400",  label: "Moderate Concern" },
  urgent:            { color: "text-red-400",      label: "Urgent Attention" }
};

const CATEGORY_ICONS = {
  skin_condition: "🔵",
  wound:          "🔴",
  inflammation:   "🟠",
  normal:         "🟢"
};

// ─── Sub-components ───────────────────────────────────────────
const Badge = ({ config, value }) => {
  const c = config[value] || config[Object.keys(config)[0]];
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${c.bg} ${c.color}`}>
      {c.label}
    </span>
  );
};

const ConditionCard = ({ condition }) => (
  <div className="border border-slate-700/50 rounded-lg p-3 bg-slate-800/40 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-base">{CATEGORY_ICONS[condition.category] || "⚪"}</span>
        <p className="text-sm font-semibold text-slate-200">{condition.name}</p>
      </div>
      <Badge config={SEVERITY_CONFIG} value={condition.severity} />
    </div>
    {condition.location && (
      <p className="text-xs text-slate-400 flex items-center gap-1">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
        </svg>
        {condition.location}
      </p>
    )}
    {condition.description && (
      <p className="text-xs text-slate-400 leading-relaxed">{condition.description}</p>
    )}
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-slate-500">Confidence:</span>
      <div className="flex gap-0.5">
        {["low", "medium", "high"].map((lvl, i) => (
          <div
            key={lvl}
            className={`w-4 h-1.5 rounded-full ${
              ["low", "medium", "high"].indexOf(condition.confidence) >= i
                ? "bg-primary-500"
                : "bg-slate-700"
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] text-slate-500 capitalize">{condition.confidence}</span>
    </div>
  </div>
);

const AnalysisResult = ({ data }) => {
  const [lang, setLang] = useState("english");
  const a = data?.analysis;
  if (!a) return null;

  const healthConfig = HEALTH_CONFIG[a.overallSkinHealth] || HEALTH_CONFIG.healthy;
  const urgencyConfig = URGENCY_CONFIG[a.urgency] || URGENCY_CONFIG.routine;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Overview Strip */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-2 flex-1">
          <div className={`w-2.5 h-2.5 rounded-full ${a.urgency === "routine" ? "bg-emerald-500" : a.urgency === "emergency" ? "bg-red-500 animate-pulse" : "bg-amber-500"}`} />
          <span className={`text-sm font-semibold ${healthConfig.color}`}>{healthConfig.label}</span>
        </div>
        <Badge config={URGENCY_CONFIG} value={a.urgency} />
        <p className="text-xs text-slate-500 w-full">
          Analyzed {new Date(a.analyzedAt || data.createdAt).toLocaleString("en-IN")}
        </p>
      </div>

      {/* Summary */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Summary</p>
          <div className="flex rounded-lg overflow-hidden border border-slate-700 text-xs">
            <button
              onClick={() => setLang("english")}
              className={`px-3 py-1 transition-colors ${lang === "english" ? "bg-primary-500 text-slate-950 font-medium" : "text-slate-400 hover:text-slate-200"}`}
            >EN</button>
            <button
              onClick={() => setLang("hindi")}
              className={`px-3 py-1 transition-colors ${lang === "hindi" ? "bg-primary-500 text-slate-950 font-medium" : "text-slate-400 hover:text-slate-200"}`}
            >हि</button>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 rounded-lg p-3">
          {lang === "english" ? a.simpleSummary?.english : a.simpleSummary?.hindi}
        </p>
      </div>

      {/* Detected Conditions */}
      {a.detectedConditions?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Detected ({a.detectedConditions.length})
          </p>
          <div className="space-y-2">
            {a.detectedConditions.map((c, i) => (
              <ConditionCard key={i} condition={c} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {a.recommendations?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recommendations</p>
          <ul className="space-y-1.5">
            {a.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Doctor Notes — show only if present */}
      {a.doctorNotes && (
        <div className="border border-blue-500/20 rounded-lg p-3 bg-blue-500/5">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Clinical Notes</p>
          <p className="text-sm text-slate-300 leading-relaxed">{a.doctorNotes}</p>
        </div>
      )}
    </div>
  );
};

// ─── History Item ─────────────────────────────────────────────
const HistoryItem = ({ item, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const a = item.analysis;

  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-800/40 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${
            a?.urgency === "routine" ? "bg-emerald-500" :
            a?.urgency === "emergency" ? "bg-red-500" : "bg-amber-500"
          }`} />
          <div>
            <p className="text-sm text-slate-200 font-medium">
              {a?.detectedConditions?.length
                ? a.detectedConditions.map(c => c.name).join(", ")
                : "No conditions detected"}
            </p>
            <p className="text-xs text-slate-500">
              {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {" · "}
              {item.analyzedByRole === "doctor" ? "By Doctor" : "Self-checkup"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {a?.overallSkinHealth && (
            <span className={`text-xs font-medium ${HEALTH_CONFIG[a.overallSkinHealth]?.color}`}>
              {HEALTH_CONFIG[a.overallSkinHealth]?.label}
            </span>
          )}
          <svg
            width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            className={`text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-700/50 px-4 py-4">
          <AnalysisResult data={item} />
          <button
            onClick={() => onDelete(item._id)}
            className="mt-3 text-xs text-red-400/60 hover:text-red-400 transition-colors"
          >
            Delete record
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────
const SkinAnalyzer = ({ mode = "patient", targetPatientId = null }) => {
  const { token, user } = useAuth();
  const [preview, setPreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Load history
  useEffect(() => {
    if (!token) return;
    const url = mode === "doctor" && targetPatientId
      ? `/skin/patient/${targetPatientId}`
      : "/skin/mine";

    axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setHistory(r.data.analyses || []))
      .catch(err => console.error("Failed to load skin history", err));
  }, [token, mode, targetPatientId]);

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported (JPG, PNG, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB.");
      return;
    }
    setError("");
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setImageData(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageData) return;
    setAnalyzing(true);
    setError("");

    try {
      const payload = { imageData };
      if (mode === "doctor" && targetPatientId) {
        payload.patientId = targetPatientId;
      }

      const res = await axios.post("/skin/analyze", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newAnalysis = res.data.analysis;
      setResult(newAnalysis);
      setHistory(prev => [newAnalysis, ...prev]);
    } catch (err) {
      setError(err?.response?.data?.message || "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/skin/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setHistory(prev => prev.filter(h => h._id !== id));
    } catch {
      setError("Failed to delete record.");
    }
  };

  const reset = () => {
    setPreview(null);
    setImageData(null);
    setResult(null);
    setError("");
  };

  return (
    <section className="border border-slate-800 rounded-xl p-4 bg-slate-900/60 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" className="text-rose-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.963-7.178z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold">
              {mode === "doctor" ? "Skin Examination" : "Skin Self-Checkup"}
            </h2>
            <p className="text-xs text-slate-500">
              {mode === "doctor" ? "AI-assisted dermatology analysis" : "Upload a photo for AI analysis"}
            </p>
          </div>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(v => !v)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            History ({history.length})
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              className={`transition-transform ${showHistory ? "rotate-180" : ""}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        )}
      </div>

      {/* Upload / Preview */}
      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); }}
          className={`border-2 border-dashed rounded-xl transition-all
            ${dragOver ? "border-rose-500 bg-rose-500/5" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/30"}`}
        >
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => processFile(e.target.files[0])} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => processFile(e.target.files[0])} />

          <div className="flex flex-col items-center gap-4 py-8 px-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-300 font-medium">Upload a skin photo</p>
              <p className="text-xs text-slate-500 mt-1">
                {mode === "doctor"
                  ? "Upload patient's skin image for clinical analysis"
                  : "Take a clear, well-lit photo of the affected area"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 transition-colors flex items-center gap-2"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                </svg>
                Browse
              </button>
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-sm text-rose-400 transition-colors flex items-center gap-2"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
                </svg>
                Camera
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Image Preview */}
          <div className="relative rounded-xl overflow-hidden border border-slate-700/60">
            <img src={preview} alt="Skin photo" className="w-full max-h-64 object-cover" />
            <button
              onClick={reset}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/80 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Analyze Button */}
          {!result && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:bg-slate-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Analyzing skin...
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.309 48.309 0 01-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"/>
                  </svg>
                  Analyze with AI
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
          </svg>
          {error}
        </div>
      )}

      {/* Result */}
      {result && <AnalysisResult data={result} />}

      {/* Analyze Another */}
      {result && (
        <button
          onClick={reset}
          className="w-full py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Analyze Another Photo
        </button>
      )}

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Past Analyses ({history.length})
          </p>
          {history.map(item => (
            <HistoryItem key={item._id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-slate-600 leading-relaxed">
        ⚠️ This AI analysis is for informational purposes only and does not constitute medical advice.
        Always consult a qualified dermatologist for diagnosis and treatment.
      </p>
    </section>
  );
};

export default SkinAnalyzer;