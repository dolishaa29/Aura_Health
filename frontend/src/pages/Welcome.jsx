import React from "react";
import { Link } from "react-router-dom";
import { Activity, Stethoscope, Shield } from "lucide-react";

const RoleCard = ({ icon: Icon, title, subtitle, accent, to, primaryLabel, secondary }) => (
  <div
    className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 sm:p-8 flex flex-col ${accent}`}
  >
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 mb-5">
      <Icon className="h-7 w-7" />
    </div>
    <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
    <p className="text-sm text-white/75 mb-6 flex-1 leading-relaxed">{subtitle}</p>
    <div className="flex flex-col sm:flex-row gap-3">
      <Link
        to={to}
        className="inline-flex justify-center items-center px-5 py-3 rounded-2xl bg-white text-slate-950 font-semibold text-sm hover:bg-white/90 transition-colors shadow-lg"
      >
        {primaryLabel}
      </Link>
      {secondary}
    </div>
  </div>
);

const Welcome = () => {
  return (
    <div className="relative min-h-[calc(100vh-56px)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_-20%,rgba(34,197,94,0.15),transparent)]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-64 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent)]" />

      <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16 space-y-12">
        <header className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-300">
            <Activity className="h-3.5 w-3.5" />
            Aura Health
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-emerald-100 to-emerald-400/90 bg-clip-text text-transparent">
            Choose your role
          </h1>
          <p className="text-slate-400 text-base sm:text-lg">Select how you want to continue.</p>
        </header>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          <RoleCard
            icon={Activity}
            title="Patient"
            subtitle="Book visits, video calls, and health tools."
            accent="from-emerald-900/80 to-slate-950 border-emerald-500/30"
            to="/login?role=patient"
            primaryLabel="Login"
            secondary={
              <Link
                to="/register"
                className="inline-flex justify-center items-center px-5 py-3 rounded-2xl border border-white/25 text-white font-medium text-sm hover:bg-white/10"
              >
                Register
              </Link>
            }
          />
          <RoleCard
            icon={Stethoscope}
            title="Doctor"
            subtitle="Manage appointments and patient care."
            accent="from-sky-900/70 to-slate-950 border-sky-500/25"
            to="/login?role=doctor"
            primaryLabel="Login"
          />
          <RoleCard
            icon={Shield}
            title="Admin"
            subtitle="Manage users and system settings."
            accent="from-violet-900/70 to-slate-950 border-violet-500/25"
            to="/login?role=admin"
            primaryLabel="Login"
          />
        </div>
      </div>
    </div>
  );
};

export default Welcome;
