import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Search,
  Stethoscope,
  IndianRupee,
  Clock,
  ChevronRight,
  Sparkles
} from "lucide-react";

const Doctors = () => {
  const { token } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/users/doctors", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDoctors(res.data.doctors || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.specialization?.toLowerCase().includes(q) ||
        d.designation?.toLowerCase().includes(q)
    );
  }, [doctors, query]);

  return (
    <div className="relative min-h-[calc(100vh-56px)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.15),transparent)]" />
      <div className="relative max-w-6xl mx-auto px-4 py-10 space-y-10">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            Verified practitioners
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-emerald-100 to-emerald-400/90 bg-clip-text text-transparent">
            Find your doctor
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Browse profiles, see experience and fees, then book an appointment in one tap.
          </p>
        </header>

        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="search"
            placeholder="Search by name, specialization, designation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-sm placeholder:text-slate-500 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-shadow"
          />
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-slate-800/50 animate-pulse border border-slate-800"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-dashed border-slate-700 bg-slate-900/40">
            <Stethoscope className="h-12 w-12 mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400">No doctors match your search yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((d) => (
              <Link
                key={d._id}
                to={`/doctors/${d._id}`}
                className="group relative rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950 p-5 shadow-lg shadow-black/20 hover:border-emerald-500/40 hover:shadow-emerald-500/5 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      d.isOnline
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-slate-700/50 text-slate-400"
                    }`}
                  >
                    {d.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
                  {d.name}
                </h2>
                <p className="text-sm text-emerald-400/90 font-medium mt-0.5">
                  {d.designation || "Medical practitioner"}
                </p>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                  {d.specialization || "General consultation"}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                  {d.experienceYears != null && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {d.experienceYears}+ yrs
                    </span>
                  )}
                  {d.consultationFee != null && (
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {d.consultationFee}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center text-sm font-medium text-emerald-400">
                  View profile
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Doctors;
