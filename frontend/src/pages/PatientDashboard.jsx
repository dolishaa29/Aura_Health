import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import { getSocket } from "../services/socket.js";
import SkinAnalyzer from "../components/SkinAnalyzer.jsx";
import MedicalReportAnalyzer from "../components/MedicalReportAnalyzer.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import PatientHero from "../components/patient/PatientHero.jsx";
import PatientStatsRow from "../components/patient/PatientStatsRow.jsx";
import BookAppointmentSection from "../components/patient/BookAppointmentSection.jsx";
import AppointmentsSection from "../components/patient/AppointmentsSection.jsx";
import { usePrivateChat } from "../hooks/usePrivateChat.js";

const PatientDashboard = () => {
  const { user, token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({ doctorId: "", scheduledAt: "" });
  const [statusUpdates, setStatusUpdates] = useState([]);
  const [bookingMsg, setBookingMsg] = useState(null);

  const {
    chatTarget,
    setChatTarget,
    chatInput,
    setChatInput,
    chatMessages,
    sendChat
  } = usePrivateChat(user?.id);

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
    socket.on("appointment-status-updated", handleStatusUpdate);
    return () => socket.off("appointment-status-updated", handleStatusUpdate);
  }, [user?.id]);

  const handleFormChange = (e) => {
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

  const upcoming = appointments.filter(
    (a) =>
      a.status !== "completed" &&
      new Date(a.scheduledAt) >= new Date(new Date().setHours(0, 0, 0, 0))
  );

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="relative min-h-[calc(100vh-56px)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(34,197,94,0.12),transparent)]" />
      <div className="relative max-w-6xl mx-auto px-4 py-8 space-y-10">
        <PatientHero firstName={firstName} />

        <PatientStatsRow
          upcomingCount={upcoming.length}
          onlineDoctorCount={doctors.filter((d) => d.isOnline).length}
          totalVisits={appointments.length}
        />

        <BookAppointmentSection
          form={form}
          doctors={doctors}
          bookingMsg={bookingMsg}
          onFieldChange={handleFormChange}
          onSubmit={createAppointment}
        />

        <AppointmentsSection
          appointments={appointments}
          onJoinCall={joinCall}
          onStartChat={startChat}
        />

        <ChatPanel
          hint={
            !chatTarget ? (
              <>
                Open an appointment and tap <strong>Chat</strong> to message your doctor.
              </>
            ) : null
          }
          messages={chatMessages}
          currentUserId={user.id}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onSend={sendChat}
          disabled={!chatTarget}
          inputPlaceholder={
            chatTarget ? "Type a message…" : "Select chat from an appointment"
          }
        />

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
