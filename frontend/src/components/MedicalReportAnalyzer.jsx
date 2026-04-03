import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";

const STATUS_COLORS = {
  normal: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  high: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  low: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  critical: "text-red-400 bg-red-400/10 border-red-400/30"
};

const OVERALL_COLORS = {
  normal: { bar: "bg-emerald-500", text: "text-emerald-400", label: "All Clear" },
  attention_needed: { bar: "bg-amber-500", text: "text-amber-400", label: "Needs Attention" },
  critical: { bar: "bg-red-500", text: "text-red-400", label: "Critical" }
};

const StatusBadge = ({ status }) => (
  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_COLORS[status] || STATUS_COLORS.normal}`}>
    {status}
  </span>
);

const OverallBanner = ({ status }) => {
  const config = OVERALL_COLORS[status] || OVERALL_COLORS.normal;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700`}>
      <div className={`w-2.5 h-2.5 rounded-full ${config.bar} animate-pulse`} />
      <span className={`text-sm font-semibold ${config.text}`}>Overall: {config.label}</span>
    </div>
  );
};

const ReportCard = ({ report, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [lang, setLang] = useState("english");
  const a = report.analysis;

  return (
    <div className="border border-slate-700/60 rounded-xl bg-slate-900/70 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-800/40 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200 truncate max-w-[200px]">{report.fileName}</p>
            <p className="text-xs text-slate-500">{new Date(report.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {a?.overallStatus && <OverallBanner status={a.overallStatus} />}
          <svg
            width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            className={`text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Analysis */}
      {expanded && a && (
        <div className="border-t border-slate-700/60 px-4 py-4 space-y-5">

          {/* Simple Summary */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Summary</p>
              <div className="flex rounded-lg overflow-hidden border border-slate-700 text-xs">
                <button
                  onClick={() => setLang("english")}
                  className={`px-3 py-1 transition-colors ${lang === "english" ? "bg-primary-500 text-slate-950 font-medium" : "text-slate-400 hover:text-slate-200"}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang("hindi")}
                  className={`px-3 py-1 transition-colors ${lang === "hindi" ? "bg-primary-500 text-slate-950 font-medium" : "text-slate-400 hover:text-slate-200"}`}
                >
                  हि
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 rounded-lg p-3">
              {lang === "english" ? a.simpleSummary?.english : a.simpleSummary?.hindi}
            </p>
          </div>

          {/* Key Findings Table */}
          {a.keyFindings?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Key Findings</p>
              <div className="rounded-lg overflow-hidden border border-slate-700/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/60 text-slate-400 text-xs">
                      <th className="text-left px-3 py-2 font-medium">Parameter</th>
                      <th className="text-left px-3 py-2 font-medium">Value</th>
                      <th className="text-left px-3 py-2 font-medium">Normal Range</th>
                      <th className="text-left px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.keyFindings.map((f, i) => (
                      <tr key={i} className={`border-t border-slate-700/40 ${f.status !== "normal" ? "bg-slate-800/20" : ""}`}>
                        <td className="px-3 py-2.5 text-slate-200 font-medium">{f.parameter}</td>
                        <td className="px-3 py-2.5 text-slate-300 font-mono text-xs">{f.value}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs">{f.normalRange || "—"}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={f.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Doctor Flags */}
          {a.doctorFlags?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Doctor Recommendations</p>
              <ul className="space-y-1.5">
                {a.doctorFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Delete */}
          <div className="flex justify-end pt-1">
            <button
              onClick={() => onDelete(report._id)}
              className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
            >
              Delete report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const MedicalReportAnalyzer = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    axios.get("/reports", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setReports(r.data.reports || []))
      .catch(err => console.error("Failed to load reports", err));
  }, [token]);

  const processFile = async (file) => {
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPDF = file.type === "application/pdf";

    if (!isImage && !isPDF) {
      setError("Only PDF or image files are supported (JPG, PNG, WEBP, PDF)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await axios.post(
        "/reports/analyze",
        {
          fileName: file.name,
          fileType: isPDF ? "pdf" : "image",
          fileData: base64
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setReports(prev => [res.data.report, ...prev]);
    } catch (err) {
      setError(err?.response?.data?.message || "Analysis failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/reports/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setReports(prev => prev.filter(r => r._id !== id));
    } catch {
      setError("Failed to delete report.");
    }
  };

  return (
    <section className="border border-slate-800 rounded-xl p-4 bg-slate-900/60 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" className="text-primary-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.309 48.309 0 01-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold">Medical Report Analysis</h2>
        <span className="text-xs text-slate-500 ml-1">AI Powered</span>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${dragOver ? "border-primary-500 bg-primary-500/5" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/30"}
          ${uploading ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileInput}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
            <div>
              <p className="text-sm font-medium text-slate-300">Analyzing your report...</p>
              <p className="text-xs text-slate-500 mt-1">AI is reading and extracting findings</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">
                Drop your report here or <span className="text-primary-400">click to browse</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG, WEBP — up to 10MB</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* Reports List */}
      {reports.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Past Reports ({reports.length})
          </p>
          {reports.map(report => (
            <ReportCard key={report._id} report={report} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {reports.length === 0 && !uploading && (
        <p className="text-xs text-slate-500 text-center py-2">No reports uploaded yet.</p>
      )}
    </section>
  );
};

export default MedicalReportAnalyzer;