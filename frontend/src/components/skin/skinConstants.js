/** Labels + Tailwind classes for API enums — keeps the main UI file short. */
export const URGENCY_CONFIG = {
  routine: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30", label: "Routine" },
  soon: { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30", label: "See Doctor Soon" },
  urgent: { color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30", label: "Urgent" },
  emergency: { color: "text-red-400", bg: "bg-red-400/10 border-red-400/30", label: "Emergency" }
};

export const SEVERITY_CONFIG = {
  none: { color: "text-slate-400", bg: "bg-slate-700/50 border-slate-600/40", label: "None" },
  mild: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30", label: "Mild" },
  moderate: { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30", label: "Moderate" },
  severe: { color: "text-red-400", bg: "bg-red-400/10 border-red-400/30", label: "Severe" }
};

export const HEALTH_CONFIG = {
  healthy: { color: "text-emerald-400", label: "Healthy" },
  mild_concern: { color: "text-amber-400", label: "Mild Concern" },
  moderate_concern: { color: "text-orange-400", label: "Moderate Concern" },
  urgent: { color: "text-red-400", label: "Urgent Attention" }
};

export const CATEGORY_ICONS = {
  skin_condition: "🔵",
  wound: "🔴",
  inflammation: "🟠",
  normal: "🟢"
};
