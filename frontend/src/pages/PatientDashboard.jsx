import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import { getSocket } from "../services/socket.js";
import SkinAnalyzer from "../components/SkinAnalyzer.jsx";
import MedicalReportAnalyzer from "../components/MedicalReportAnalyzer.jsx";
import {
  Calendar,
  MessageCircle,
  Stethoscope,
  Video,
  Activity,
  ChevronRight,
  Sparkles,
  AlertCircle
} from "lucide-react";

const PatientDashboard = () => {
  const { user, token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({ doctorId: "", scheduledAt: "" });
  const [statusUpdates, setStatusUpdates] = useState([]);
  const [chatTarget, setChatTarget] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [bookingMsg, setBookingMsg] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const [apptRes, doctorsRes] = await Promise.all([
        axios.get("/appointments/mine", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get("/users/doctors", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setAppointments(apptRes.data.appointments || []);
      setDoctors(doctorsRes.data.doctors || []);
    };
    if (token) {
      loadData().catch((err) =>
        console.error("Failed to load patient data", err?.response?.data || err.message)
      );
    }
  }, [token]);

  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket(user.id);
    const handleStatusUpdate = ({ appointmentId, status }) => {
      setStatusUpdates((prev) => [...prev, { appointmentId, status }]);
      setAppointments((prev) =>
        prev.map((a) => (a._id === appointmentId ? { ...a, status } : a))
      );
    };
    const handlePrivateMessage = ({ fromUserId, message, timestamp }) => {
      setChatMessages((prev) => [...prev, { fromUserId, message, timestamp }]);
    };
    socket.on("appointment-status-updated", handleStatusUpdate);
    socket.on("private-message", handlePrivateMessage);
    return () => {
      socket.off("appointment-status-updated", handleStatusUpdate);
      socket.off("private-message", handlePrivateMessage);
    };
  }, [user?.id]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const createAppointment = async (e) => {
    e.preventDefault();
    setBookingMsg(null);
    await axios.post(
      "/appointments",
      { doctorId: form.doctorId, scheduledAt: form.scheduledAt },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const res = await axios.get("/appointments/mine", {
      headers: { Authorization: `Bearer ${token}` }
    });
    setAppointments(res.data.appointments || []);
    setForm({ doctorId: "", scheduledAt: "" });
    setBookingMsg("Appointment requested.");
  };

  const joinCall = (appt) => {
    const roomId = appt.roomId || appt._id;
    window.open(`/video/${roomId}`, "_self");
  };

  const startChat = (appt) => {
    const docId = appt.doctorId?._id || appt.doctorId;
    if (!docId) return;
    setChatTarget(docId);
  };

  const sendChat = () => {
    if (!chatTarget || !chatInput.trim() || !user?.id) return;
    const socket = getSocket(user.id);
    if (!socket) return;
    const message = chatInput.trim();
    socket.emit("private-message", { toUserId: chatTarget, message });
    setChatMessages((prev) => [
      ...prev,
      { fromUserId: user.id, message, timestamp: new Date().toISOString() }
    ]);
    setChatInput("");
  };

  const upcoming = appointments.filter(
    (a) => a.status !== "completed" && new Date(a.scheduledAt) >= new Date(new Date().setHours(0, 0, 0, 0))
  );

  return (
    <div className="relative min-h-[calc(100vh-56px)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(34,197,94,0.12),transparent)]" />
      <div className="relative max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Hero */}
        <section className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/95 via-slate-950 to-emerald-950/20 p-8 sm:p-10 overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <p className="text-sm text-emerald-400/90 font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Your health hub
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Hi, {user?.name?.split(" ")[0] || "there"}
              </h1>
              <p className="text-slate-400 max-w-lg">
                Book specialists, join video visits, chat with your doctor, and use AI tools — all
                in one calm, modern place.
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

        {/* Quick stats */}
        <section className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Upcoming", value: upcoming.length, icon: Calendar },
            { label: "Doctors available", value: doctors.filter((d) => d.isOnline).length, icon: Activity },
            { label: "Total visits", value: appointments.length, icon: Video }
          ].map(({ label, value, icon: Icon }) => (
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

        {/* Book inline */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-400" />
                Quick book
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Or browse full profiles in{" "}
                <Link to="/doctors" className="text-emerald-400 hover:underline">
                  Find doctors
                </Link>
                .
              </p>
            </div>
          </div>
          <form onSubmit={createAppointment} className="grid gap-4 md:grid-cols-12 items-end">
            <div className="md:col-span-5">
              <label className="block text-xs text-slate-400 mb-1.5">Doctor</label>
              <select
                name="doctorId"
                value={form.doctorId}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm focus:border-emerald-500/50"
                required
              >
                <option value="">Select a doctor</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                    {d.designation ? ` — ${d.designation}` : ""}
                    {d.specialization ? ` (${d.specialization})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs text-slate-400 mb-1.5">Date & time</label>
              <input
                type="datetime-local"
                name="scheduledAt"
                value={form.scheduledAt}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm focus:border-emerald-500/50"
                required
              />
            </div>
            <div className="md:col-span-3">
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm hover:bg-emerald-400 transition-colors"
              >
                Request appointment
              </button>
            </div>
          </form>
          {bookingMsg && <p className="mt-3 text-sm text-emerald-400">{bookingMsg}</p>}
        </section>

        {/* Appointments */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Appointments</h2>
          <div className="grid gap-4">
            {appointments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-500">
                No appointments yet. Book above or from a doctor&apos;s profile.
              </div>
            )}
            {appointments.map((appt) => {
              const doc = appt.doctorId;
              return (
                <div
                  key={appt._id}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-emerald-500/30 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-white flex flex-wrap items-center gap-2">
                      {doc?.name || "Doctor"}
                      {doc?.designation && (
                        <span className="text-xs font-normal text-emerald-400/90">{doc.designation}</span>
                      )}
                    </p>
                    <p className="text-sm text-slate-400">
                      {doc?.specialization}{" "}
                      {doc?.consultationFee != null && (
                        <span className="text-slate-500">• ₹{doc.consultationFee}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(appt.scheduledAt).toLocaleString()} ·{" "}
                      <span className="uppercase text-emerald-500/80">{appt.status}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {doc?._id && (
                      <Link
                        to={`/doctors/${doc._id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 text-xs font-medium hover:bg-slate-700"
                      >
                        Profile <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}
                    {appt.status === "approved" && (
                      <button
                        type="button"
                        onClick={() => joinCall(appt)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-medium"
                      >
                        <Video className="h-4 w-4" />
                        Join call
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startChat(appt)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-600 text-sm"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Chat
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Chat */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col min-h-[280px]">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            Messages
          </h2>
          {!chatTarget && (
            <p className="text-sm text-slate-500 mb-3">
              Open an appointment and tap <strong>Chat</strong> to message your doctor.
            </p>
          )}
          <div className="flex-1 border border-slate-800 rounded-xl p-3 mb-3 overflow-y-auto max-h-64 space-y-2 text-sm">
            {chatMessages.length === 0 && (
              <p className="text-slate-600 text-xs">No messages yet.</p>
            )}
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.fromUserId === user.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[85%] ${
                    m.fromUserId === user.id
                      ? "bg-emerald-500 text-slate-950 rounded-br-md"
                      : "bg-slate-800 text-slate-100 rounded-bl-md"
                  }`}
                >
                  <p>{m.message}</p>
                  <p className="text-[10px] mt-1 opacity-70">
                    {new Date(m.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder={chatTarget ? "Type a message…" : "Select chat from an appointment"}
              disabled={!chatTarget}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm focus:border-emerald-500/50"
            />
            <button
              type="button"
              onClick={sendChat}
              disabled={!chatTarget || !chatInput.trim()}
              className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 text-sm font-medium disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </section>

        <SkinAnalyzer mode="patient" />
        <MedicalReportAnalyzer />

        {statusUpdates.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/30 px-4 py-3">
            <h3 className="text-xs font-medium text-slate-500 mb-2">Recent updates</h3>
            <ul className="text-xs text-slate-400 space-y-1">
              {statusUpdates.slice(-5).map((s, idx) => (
                <li key={idx}>
                  Appointment status → <span className="text-emerald-400">{s.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
