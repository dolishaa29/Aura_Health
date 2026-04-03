import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import DoctorDashboard from "./pages/DoctorDashboard.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import VideoCall from "./pages/VideoCall.jsx";
import Doctors from "./pages/Doctors.jsx";
import DoctorProfile from "./pages/DoctorProfile.jsx";
import EmergencyMode from "./pages/EmergencyMode.jsx";
import Welcome from "./pages/Welcome.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { getSocket, disconnectSocket } from "./services/socket.js";

/** Logged-in users → dashboard; guests → role picker landing */
const HomeGate = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    );
  }
  if (!user) return <Welcome />;
  if (user.role === "doctor") return <Navigate to="/doctor" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/patient" replace />;
};

const App = () => {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (user?.id) {
      getSocket(user.id);
    } else {
      disconnectSocket();
    }
  }, [user?.id]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomeGate />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute roles={["doctor"]} />}>
            <Route path="/doctor" element={<DoctorDashboard />} />
          </Route>
          <Route element={<ProtectedRoute roles={["patient"]} />}>
            <Route path="/patient" element={<PatientDashboard />} />
          </Route>
          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          <Route element={<ProtectedRoute roles={["doctor", "patient"]} />}>
            <Route path="/video/:roomId" element={<VideoCall />} />
          </Route>

          <Route element={<ProtectedRoute roles={["patient", "doctor", "admin"]} />}>
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/doctors/:id" element={<DoctorProfile />} />
          </Route>

          <Route element={<ProtectedRoute roles={["patient", "doctor"]} />}>
            <Route path="/emergency" element={<EmergencyMode />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;

