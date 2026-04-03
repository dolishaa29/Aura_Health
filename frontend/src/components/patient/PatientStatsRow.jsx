import React from "react";
import { Calendar, Video, Activity } from "lucide-react";

const PatientStatsRow = ({ upcomingCount, onlineDoctorCount, totalVisits }) => {
  const items = [
    { label: "Upcoming", value: upcomingCount, icon: Calendar },
    { label: "Doctors online", value: onlineDoctorCount, icon: Activity },
    { label: "Total visits", value: totalVisits, icon: Video }
  ];

  return (
    <section className="grid sm:grid-cols-3 gap-4">
      {items.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex items-center gap-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-emerald-400">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        </div>
      ))}
    </section>
  );
};

export default PatientStatsRow;
