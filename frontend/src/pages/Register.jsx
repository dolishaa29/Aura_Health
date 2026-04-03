import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { HeartPulse } from "lucide-react";
import PhoneNumber from "../components/PhoneNumber.jsx";
import { validateEmail, validatePassword, validatePhoneE164 } from "../utils/validation.js";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: ""
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required";
    const em = validateEmail(form.email);
    if (em) next.email = em;
    const pw = validatePassword(form.password);
    if (pw) next.password = pw;
    const ph = validatePhoneE164(form.phone);
    if (ph) next.phone = ph;
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone
      });
      navigate("/patient");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-8 shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <HeartPulse className="h-7 w-7" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-1">Create account</h1>
        <p className="text-sm text-slate-500 text-center mb-6">New patient registration.</p>
        {error && (
          <p className="mb-4 text-sm text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-sm ${
                fieldErrors.name ? "border-rose-500/60" : "border-slate-700 focus:border-emerald-500/50"
              }`}
              autoComplete="name"
            />
            {fieldErrors.name && (
              <p className="mt-1.5 text-xs text-rose-400">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-sm ${
                fieldErrors.email ? "border-rose-500/60" : "border-slate-700 focus:border-emerald-500/50"
              }`}
              autoComplete="email"
            />
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-rose-400">{fieldErrors.email}</p>
            )}
          </div>

          <PhoneNumber
            id="phone"
            name="phone"
            value={form.phone}
            onChange={(e164) => {
              setForm((prev) => ({ ...prev, phone: e164 }));
              if (fieldErrors.phone) {
                setFieldErrors((prev) => ({ ...prev, phone: undefined }));
              }
            }}
            error={fieldErrors.phone}
            defaultCountry="IN"
          />

          <div>
            <label className="block text-xs text-slate-400 mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-sm ${
                fieldErrors.password ? "border-rose-500/60" : "border-slate-700 focus:border-emerald-500/50"
              }`}
              autoComplete="new-password"
              minLength={8}
            />
            {fieldErrors.password ? (
              <p className="mt-1.5 text-xs text-rose-400">{fieldErrors.password}</p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-600">
                At least 8 characters, with letters and numbers.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-sm text-center text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="text-emerald-400 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
