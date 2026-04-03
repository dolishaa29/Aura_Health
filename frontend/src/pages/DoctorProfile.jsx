import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import {
  ArrowLeft,
  Stethoscope,
  IndianRupee,
  Clock,
  CalendarPlus,
  Loader2
} from "lucide-react";

const DoctorProfile = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");
  const [booking, setBooking] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/users/doctors/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDoctor(res.data.doctor);
      } catch (e) {
        setDoctor(null);
      } finally {
        setLoading(false);
      }
    };
    if (token && id) load();
  }, [token, id]);

  const book = async (e) => {
    e.preventDefault();
    if (user?.role !== "patient") {
      setMsg("Only patients can book appointments.");
      return;
    }
    if (!scheduledAt) return;
    setBooking(true);
    setMsg(null);
    try {
      await axios.post(
        "/appointments",
        { doctorId: id, scheduledAt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg("Appointment requested successfully.");
      setScheduledAt("");
      setTimeout(() => navigate("/patient"), 1500);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Could not book.");
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-slate-400 mb-4">Doctor not found.</p>
        <Link to="/doctors" className="text-emerald-400 hover:underline">
          Back to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-56px)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_-10%,rgba(34,197,94,0.12),transparent)]" />
      <div className="relative max-w-3xl mx-auto px-4 py-8 space-y-8">
        <Link
          to="/doctors"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All doctors
        </Link>

        <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
              <Stethoscope className="h-10 w-10" />
            </div>
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{doctor.name}</h1>
              <p className="text-lg text-emerald-400 font-medium">
                {doctor.designation || "Doctor"}
              </p>
              <p className="text-slate-300">{doctor.specialization || "Consultation"}</p>
              <div className="flex flex-wrap gap-4 pt-2 text-sm text-slate-400">
                {doctor.experienceYears != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-emerald-500/80" />
                    {doctor.experienceYears} years experience
                  </span>
                )}
                {doctor.consultationFee != null && (
                  <span className="inline-flex items-center gap-1.5 text-slate-200">
                    <IndianRupee className="h-4 w-4 text-emerald-500/80" />
                    Fee: ₹{doctor.consultationFee}
                  </span>
                )}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                    doctor.isOnline
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {doctor.isOnline ? "Online now" : "Offline"}
                </span>
              </div>
            </div>
          </div>

          {doctor.bio && (
            <div className="mt-8 pt-8 border-t border-slate-800">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                About
              </h2>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{doctor.bio}</p>
            </div>
          )}

          {user?.role === "patient" && (
            <form
              onSubmit={book}
              className="mt-8 pt-8 border-t border-slate-800 space-y-4"
            >
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CalendarPlus className="h-5 w-5 text-emerald-400" />
                Book appointment
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm focus:border-emerald-500/60"
                />
                <button
                  type="submit"
                  disabled={booking}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 disabled:opacity-50"
                >
                  {booking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Request slot"
                  )}
                </button>
              </div>
              {msg && (
                <p
                  className={`text-sm ${msg.includes("success") ? "text-emerald-400" : "text-amber-400"}`}
                >
                  {msg}
                </p>
              )}
            </form>
          )}

          {user?.role !== "patient" && (
            <p className="mt-8 text-sm text-slate-500">
              Sign in as a patient to book an appointment with this doctor.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;
