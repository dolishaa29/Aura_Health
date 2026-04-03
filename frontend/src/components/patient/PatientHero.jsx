import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, Stethoscope, AlertCircle } from "lucide-react";

const PatientHero = ({ firstName }) => (
  <section className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/95 via-slate-950 to-emerald-950/20 p-8 sm:p-10 overflow-hidden">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
      <div className="space-y-2">
        <p className="text-sm text-emerald-400/90 font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Your health hub
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Hi, {firstName}
        </h1>
        <p className="text-slate-400 max-w-lg">
          Book doctors, video visits, chat, and AI tools — in one place.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/doctors"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors"
        >
          <Stethoscope className="h-4 w-4" />
          Find doctors
        </Link>
        <Link
          to="/emergency"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-rose-500/50 bg-rose-500/10 text-rose-100 font-semibold text-sm hover:bg-rose-500/20 transition-colors"
        >
          <AlertCircle className="h-4 w-4" />
          Emergency assist
        </Link>
      </div>
    </div>
  </section>
);

export default PatientHero;
