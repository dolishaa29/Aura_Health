import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Loader2,
  Stethoscope,
  Shield
} from "lucide-react";

const emptyDoctorForm = {
  name: "",
  email: "",
  password: "",
  specialization: "",
  designation: "",
  bio: "",
  experienceYears: "",
  consultationFee: ""
};

const AdminDashboard = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [analytics, setAnalytics] = useState({ totalUsers: 0, doctors: 0, patients: 0 });
  const [form, setForm] = useState(emptyDoctorForm);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyDoctorForm);

  const loadUsers = async () => {
    const res = await axios.get("/users", {
      headers: { Authorization: `Bearer ${token}` }
    });
    setUsers(res.data.users || []);
  };

  const loadDoctors = async () => {
    const res = await axios.get("/users/doctors", {
      headers: { Authorization: `Bearer ${token}` }
    });
    setDoctors(res.data.doctors || []);
  };

  useEffect(() => {
    if (!token) return;
    Promise.all([loadUsers(), loadDoctors()]).catch((err) =>
      console.error("Failed to load admin data", err?.response?.data || err.message)
    );
  }, [token]);

  useEffect(() => {
    const totalUsers = users.length;
    const doctorsCount = users.filter((u) => u.role === "doctor").length;
    const patients = users.filter((u) => u.role === "patient").length;
    setAnalytics({ totalUsers, doctors: doctorsCount, patients });
  }, [users]);

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    await axios.delete(`/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setUsers((prev) => prev.filter((u) => u._id !== id));
    loadDoctors();
  };

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const createDoctor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg(null);
    try {
      await axios.post(
        "/users/doctors",
        {
          ...form,
          experienceYears: form.experienceYears === "" ? undefined : Number(form.experienceYears),
          consultationFee: form.consultationFee === "" ? undefined : Number(form.consultationFee)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setForm(emptyDoctorForm);
      setFormMsg("Doctor account created.");
      await Promise.all([loadUsers(), loadDoctors()]);
    } catch (err) {
      setFormMsg(err?.response?.data?.message || "Could not create doctor.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (d) => {
    setEditingId(d._id);
    setEditForm({
      name: d.name || "",
      email: d.email || "",
      password: "",
      specialization: d.specialization || "",
      designation: d.designation || "",
      bio: d.bio || "",
      experienceYears: d.experienceYears ?? "",
      consultationFee: d.consultationFee ?? ""
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    setSubmitting(true);
    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
        specialization: editForm.specialization,
        designation: editForm.designation,
        bio: editForm.bio,
        experienceYears:
          editForm.experienceYears === "" ? undefined : Number(editForm.experienceYears),
        consultationFee:
          editForm.consultationFee === "" ? undefined : Number(editForm.consultationFee)
      };
      if (editForm.password && editForm.password.length >= 6) {
        payload.password = editForm.password;
      }
      await axios.patch(`/users/doctors/${editingId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingId(null);
      await Promise.all([loadUsers(), loadDoctors()]);
    } catch (err) {
      alert(err?.response?.data?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-56px)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.08),transparent)]" />
      <div className="relative max-w-6xl mx-auto px-4 py-8 space-y-10">
        <header className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin console</h1>
            <p className="text-sm text-slate-400">Manage doctors and users</p>
          </div>
        </header>

        <section className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Total users", value: analytics.totalUsers },
            { label: "Doctors", value: analytics.doctors },
            { label: "Patients", value: analytics.patients }
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur"
            >
              <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-3xl font-bold text-white mt-1">{s.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">Add doctor (only admins)</h2>
          </div>
          <form onSubmit={createDoctor} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["name", "Full name", "text"],
              ["email", "Email", "email"],
              ["password", "Password (min 6)", "password"],
              ["designation", "Designation (e.g. MD, MBBS)", "text"],
              ["specialization", "Specialization", "text"],
              ["experienceYears", "Experience (years)", "number"],
              ["consultationFee", "Consultation fee (₹)", "number"]
            ].map(([name, label, type]) => (
              <div key={name}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input
                  name={name}
                  type={type}
                  value={form[name]}
                  onChange={handleFormChange}
                  required={["name", "email", "password"].includes(name)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm focus:border-emerald-500/50"
                />
              </div>
            ))}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs text-slate-400 mb-1">Bio / about</label>
              <textarea
                name="bio"
                rows={3}
                value={form.bio}
                onChange={handleFormChange}
                placeholder="Short professional bio for patients..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm focus:border-emerald-500/50 resize-none"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-semibold disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
                Create doctor account
              </button>
              {formMsg && <span className="text-sm text-emerald-400">{formMsg}</span>}
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-emerald-400" />
            <h2 className="font-semibold">Doctors directory</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-800">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Fee</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((d) => (
                  <tr key={d._id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-medium">{d.name}</td>
                    <td className="py-3 px-4 text-slate-400">{d.designation || "—"}</td>
                    <td className="py-3 px-4">
                      {d.consultationFee != null ? `₹${d.consultationFee}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(d)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-xs mr-2"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-slate-400" />
            <h2 className="font-semibold">All users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-800">
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Specialization</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b border-slate-900/60">
                    <td className="py-2">{u.name}</td>
                    <td className="py-2 text-slate-400">{u.email}</td>
                    <td className="py-2 capitalize">{u.role}</td>
                    <td className="py-2 text-slate-400">{u.specialization || "—"}</td>
                    <td className="py-2 text-right">
                      {u.role !== "admin" && (
                        <button
                          type="button"
                          onClick={() => deleteUser(u._id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/20 text-rose-300 text-xs"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {editingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Edit doctor</h3>
              <form onSubmit={saveEdit} className="space-y-3">
                {["name", "email", "password", "designation", "specialization"].map((field) => (
                  <div key={field}>
                    <label className="block text-xs text-slate-400 mb-1 capitalize">{field}</label>
                    <input
                      type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                      value={editForm[field]}
                      onChange={(e) => setEditForm((p) => ({ ...p, [field]: e.target.value }))}
                      placeholder={field === "password" ? "Leave blank to keep" : ""}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                    />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Experience (yrs)</label>
                    <input
                      type="number"
                      value={editForm.experienceYears}
                      onChange={(e) => setEditForm((p) => ({ ...p, experienceYears: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fee (₹)</label>
                    <input
                      type="number"
                      value={editForm.consultationFee}
                      onChange={(e) => setEditForm((p) => ({ ...p, consultationFee: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Bio</label>
                  <textarea
                    rows={3}
                    value={editForm.bio}
                    onChange={(e) => setEditForm((p) => ({ ...p, bio: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-medium"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800"
                  >
                    Cancell
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
