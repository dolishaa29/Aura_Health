import React from "react";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";

const BookAppointmentSection = ({
  form,
  doctors,
  bookingMsg,
  onFieldChange,
  onSubmit
}) => (
  <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-400" />
          Quick book
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Or browse profiles in{" "}
          <Link to="/doctors" className="text-emerald-400 hover:underline">
            Find doctors
          </Link>
          .
        </p>
      </div>
    </div>
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-12 items-end">
      <div className="md:col-span-5">
        <label className="block text-xs text-slate-400 mb-1.5">Doctor</label>
        <select
          name="doctorId"
          value={form.doctorId}
          onChange={onFieldChange}
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
          onChange={onFieldChange}
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
);

export default BookAppointmentSection;
