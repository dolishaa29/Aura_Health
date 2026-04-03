import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getSocket } from "../services/socket.js";
import SkinAnalyzer from "../components/SkinAnalyzer.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import { usePrivateChat } from "../hooks/usePrivateChat.js";

const DoctorDashboard = () => {
  const { user, token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [onlinePatients, setOnlinePatients] = useState({});
  const [skinPatientId, setSkinPatientId] = useState(null);

  const {
    chatTarget,
    setChatTarget,
    chatInput,
    setChatInput,
    chatMessages,
    sendChat
  } = usePrivateChat(user?.id);

  useEffect(() => {
    const fetchAppointments = async () => {
      const res = await axios.get("/appointments/mine", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(res.data.appointments || []);
    };
    if (token) {
      fetchAppointments().catch((err) =>
        console.error("Failed to load appointments", err?.response?.data || err.message)
      );
    }
  }, [token]);

  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket(user.id);

    const handleStatus = ({ userId, isOnline }) => {
      setOnlinePatients((prev) => ({ ...prev, [userId]: isOnline }));
    };

    socket.on("user-online-status", handleStatus);

    return () => {
      socket.off("user-online-status", handleStatus);
    };
  }, [user?.id]);

  const startCall = async (appt) => {
    try {
      const roomId = appt.roomId || appt._id;

      await axios.patch(
        `/appointments/${appt._id}/status`,
        { status: "approved", roomId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAppointments((prev) =>
        prev.map((a) => (a._id === appt._id ? { ...a, status: "approved", roomId } : a))
      );

      const socket = getSocket(user.id);
      socket.emit("appointment-status-updated", {
        appointmentId: appt._id,
        status: "approved",
        doctorId: appt.doctorId?._id || user.id,
        patientId: appt.patientId?._id
      });

      window.open(`/video/${roomId}`, "_self");
    } catch (err) {
      console.error("Failed to start call / approve appointment", err?.response?.data || err);
    }
  };

  const toggleSkinExam = (patientId) => {
    setSkinPatientId((prev) => (prev === patientId ? null : patientId));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-[2fr,1.2fr]">
        <section>
          <h2 className="text-xl font-semibold mb-3">My Appointments</h2>
          <div className="space-y-3">
            {appointments.length === 0 && (
              <p className="text-sm text-slate-400">No appointments yet.</p>
            )}
            {appointments.map((appt) => (
              <div
                key={appt._id}
                className="border border-slate-800 rounded-xl p-4 bg-slate-900/60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {appt.patientId?.name || "Patient"}{" "}
                      <span className="text-xs text-slate-500">
                        {onlinePatients[appt.patientId?._id] ? "● online" : "○ offline"}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(appt.scheduledAt).toLocaleString()} •{" "}
                      <span className="uppercase">{appt.status}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => startCall(appt)}
                      className="px-3 py-1.5 rounded-md bg-primary-500 text-slate-950 text-sm"
                    >
                      Start Call
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatTarget(appt.patientId?._id)}
                      className="px-3 py-1.5 rounded-md bg-slate-800 text-sm"
                    >
                      Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSkinExam(appt.patientId?._id)}
                      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                        skinPatientId === appt.patientId?._id
                          ? "bg-rose-500 text-white"
                          : "bg-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-300"
                      }`}
                    >
                      {skinPatientId === appt.patientId?._id ? "Close Skin" : "Skin Exam"}
                    </button>
                  </div>
                </div>

                {skinPatientId === appt.patientId?._id && (
                  <div className="mt-4">
                    <SkinAnalyzer mode="doctor" targetPatientId={appt.patientId?._id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-3">
          <ChatPanel
            title="Chat"
            className="rounded-xl min-h-0"
            hint={
              !chatTarget ? (
                <span className="text-sm text-slate-400">
                  Pick <strong>Chat</strong> on an appointment to message that patient.
                </span>
              ) : null
            }
            messages={chatMessages}
            currentUserId={user.id}
            chatInput={chatInput}
            onChatInputChange={setChatInput}
            onSend={sendChat}
            disabled={!chatTarget}
            inputPlaceholder={chatTarget ? "Type a message…" : "Select a patient to chat"}
          />
          <Link
            to="/"
            className="block text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
