import React from "react";
import { Link } from "react-router-dom";
import { Video, MessageCircle, ChevronRight } from "lucide-react";

const AppointmentsSection = ({ appointments, onJoinCall, onStartChat }) => (
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
                  onClick={() => onJoinCall(appt)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-medium"
                >
                  <Video className="h-4 w-4" />
                  Join call
                </button>
              )}
              <button
                type="button"
                onClick={() => onStartChat(appt)}
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
);

export default AppointmentsSection;
