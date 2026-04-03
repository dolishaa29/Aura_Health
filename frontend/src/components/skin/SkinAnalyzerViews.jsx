import React, { useState } from "react";
import {
  CATEGORY_ICONS,
  HEALTH_CONFIG,
  SEVERITY_CONFIG,
  URGENCY_CONFIG
} from "./skinConstants.js";

const Badge = ({ config, value }) => {
  const c = config[value] || config[Object.keys(config)[0]];
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${c.bg} ${c.color}`}
    >
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
          />
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

export const SkinAnalysisResult = ({ data }) => {
  const [lang, setLang] = useState("english");
  const a = data?.analysis;
  if (!a) return null;

  const healthConfig = HEALTH_CONFIG[a.overallSkinHealth] || HEALTH_CONFIG.healthy;

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-2 flex-1">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              a.urgency === "routine"
                ? "bg-emerald-500"
                : a.urgency === "emergency"
                  ? "bg-red-500 animate-pulse"
                  : "bg-amber-500"
            }`}
          />
          <span className={`text-sm font-semibold ${healthConfig.color}`}>{healthConfig.label}</span>
        </div>
        <Badge config={URGENCY_CONFIG} value={a.urgency} />
        <p className="text-xs text-slate-500 w-full">
          Analyzed {new Date(a.analyzedAt || data.createdAt).toLocaleString("en-IN")}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Summary</p>
          <div className="flex rounded-lg overflow-hidden border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setLang("english")}
              className={`px-3 py-1 transition-colors ${
                lang === "english"
                  ? "bg-primary-500 text-slate-950 font-medium"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("hindi")}
              className={`px-3 py-1 transition-colors ${
                lang === "hindi"
                  ? "bg-primary-500 text-slate-950 font-medium"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              हि
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 rounded-lg p-3">
          {lang === "english" ? a.simpleSummary?.english : a.simpleSummary?.hindi}
        </p>
      </div>

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

      {a.recommendations?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Recommendations
          </p>
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

      {a.doctorNotes && (
        <div className="border border-blue-500/20 rounded-lg p-3 bg-blue-500/5">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
            Clinical Notes
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">{a.doctorNotes}</p>
        </div>
      )}
    </div>
  );
};

export const SkinHistoryItem = ({ item, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const a = item.analysis;

  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-800/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpanded((v) => !v);
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              a?.urgency === "routine"
                ? "bg-emerald-500"
                : a?.urgency === "emergency"
                  ? "bg-red-500"
                  : "bg-amber-500"
            }`}
          />
          <div>
            <p className="text-sm text-slate-200 font-medium">
              {a?.detectedConditions?.length
                ? a.detectedConditions.map((c) => c.name).join(", ")
                : "No conditions detected"}
            </p>
            <p className="text-xs text-slate-500">
              {new Date(item.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
              })}
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
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-700/50 px-4 py-4">
          <SkinAnalysisResult data={item} />
          <button
            type="button"
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
