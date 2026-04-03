import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Activity, LayoutDashboard, Stethoscope, Shield, AlertTriangle } from "lucide-react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const dashPath =
    user?.role === "doctor" ? "/doctor" : user?.role === "admin" ? "/admin" : "/patient";

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link to={user ? dashPath : "/"} className="flex items-center gap-2 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25">
            <Activity className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-emerald-200/90 bg-clip-text text-transparent">
            Aura Health
          </span>
        </Link>

        {user && (
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            <Link
              to={dashPath}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            {(user.role === "patient" || user.role === "doctor" || user.role === "admin") && (
              <Link
                to="/doctors"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                <Stethoscope className="h-4 w-4" />
                Doctors
              </Link>
            )}
            {(user.role === "patient" || user.role === "doctor") && (
              <Link
                to="/emergency"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-rose-300/90 hover:bg-rose-500/10 transition-colors"
              >
                <AlertTriangle className="h-4 w-4" />
                Emergency
              </Link>
            )}
            {user.role === "admin" && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user ? (
            <>
              <span className="hidden sm:inline text-xs text-slate-500 max-w-[140px] truncate">
                {user.name}
              </span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                {user.role}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-800/80"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
