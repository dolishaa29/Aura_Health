import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getSocket } from "../services/socket.js";
import SkinAnalyzer from "../components/SkinAnalyzer.jsx";

const DoctorDashboard = () => {
  const { user, token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [onlinePatients, setOnlinePatients] = useState({});
  const [chatTarget, setChatTarget] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [skinPatientId, setSkinPatientId] = useState(null); // which patient's skin to examine

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

    const handlePrivateMessage = ({ fromUserId, message, timestamp }) => {
      setChatMessages((prev) => [...prev, { fromUserId, message, timestamp }]);
    };

    socket.on("user-online-status", handleStatus);
    socket.on("private-message", handlePrivateMessage);

    return () => {
      socket.off("user-online-status", handleStatus);
      socket.off("private-message", handlePrivateMessage);
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

  const sendChat = () => {
    if (!chatTarget || !chatInput.trim()) return;
    const socket = getSocket(user.id);
    socket.emit("private-message", {
      toUserId: chatTarget,
      message: chatInput.trim()
    });
    setChatMessages((prev) => [
      ...prev,
      { fromUserId: user.id, message: chatInput.trim(), timestamp: new Date().toISOString() }
    ]);
    setChatInput("");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Top grid — Appointments + Chat */}
      <div className="grid gap-6 md:grid-cols-[2fr,1.2fr]">

        {/* Appointments */}
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
                      onClick={() => startCall(appt)}
                      className="px-3 py-1.5 rounded-md bg-primary-500 text-slate-950 text-sm"
                    >
                      Start Call
                    </button>
                    <button
                      onClick={() => setChatTarget(appt.patientId?._id)}
                      className="px-3 py-1.5 rounded-md bg-slate-800 text-sm"
                    >
                      Chat
                    </button>
                    {/* Skin Examine button — toggles SkinAnalyzer for this patient */}
                    <button
                      onClick={() =>
                        setSkinPatientId((prev) =>
                          prev === appt.patientId?._id ? null : appt.patientId?._id
                        )
                      }
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

                {/* SkinAnalyzer — shown only for selected patient */}
                {skinPatientId === appt.patientId?._id && (
                  <div className="mt-4">
                    <SkinAnalyzer
                      mode="doctor"
                      targetPatientId={appt.patientId?._id}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Chat */}
        <section className="border border-slate-800 rounded-xl p-4 bg-slate-900/60 flex flex-col">
          <h2 className="text-lg font-semibold mb-2">Chat</h2>
          {!chatTarget && (
            <p className="text-sm text-slate-400 mb-2">
              Select a patient from your appointments to start chatting.
            </p>
          )}
          <div className="flex-1 border border-slate-800 rounded-md p-2 mb-3 overflow-y-auto space-y-1 text-sm">
            {chatMessages.length === 0 && (
              <p className="text-slate-500 text-xs">No messages yet.</p>
            )}
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.fromUserId === user.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-2 py-1 rounded-md max-w-[80%] ${
                    m.fromUserId === user.id
                      ? "bg-primary-500 text-slate-950"
                      : "bg-slate-800 text-slate-100"
                  }`}
                >
                  <p>{m.message}</p>
                  <p className="text-[10px] mt-0.5 text-slate-200/60">
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
              placeholder={chatTarget ? "Type a message..." : "Select a patient to chat"}
              disabled={!chatTarget}
              className="flex-1 px-3 py-2 rounded-md bg-slate-950 border border-slate-800 focus:border-primary-500 text-sm"
            />
            <button
              onClick={sendChat}
              disabled={!chatTarget || !chatInput.trim()}
              className="px-3 py-2 rounded-md bg-primary-500 text-slate-950 text-sm disabled:bg-slate-700"
            >
              Send
            </button>
          </div>
          <Link
            to="/"
            className="mt-4 text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2"
          >
            Back to home
          </Link>
        </section>
      </div>
    </div>
  );
};

export default DoctorDashboard;

