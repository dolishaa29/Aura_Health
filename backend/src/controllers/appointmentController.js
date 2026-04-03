import { Appointment } from "../models/Appointment.js";

export const createAppointment = async (req, res) => {
  try {
    const { doctorId, scheduledAt } = req.body;

    if (!doctorId || !scheduledAt) {
      return res.status(400).json({ message: "doctorId and scheduledAt are required" });
    }

    const appointment = await Appointment.create({
      doctorId,
      patientId: req.user._id,
      scheduledAt,
      status: "pending"
    });

    return res.status(201).json({ appointment });
  } catch (error) {
    console.error("Create appointment error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getMyAppointments = async (req, res) => {
  try {
    const filter =
      req.user.role === "doctor"
        ? { doctorId: req.user._id }
        : { patientId: req.user._id };

    const appointments = await Appointment.find(filter)
      .populate(
        "doctorId",
        "name email specialization designation bio experienceYears consultationFee isOnline"
      )
      .populate("patientId", "name email")
      .sort({ scheduledAt: 1 });

    return res.status(200).json({ appointments });
  } catch (error) {
    console.error("Get appointments error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, roomId } = req.body;

    if (!["pending", "approved", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (
      req.user.role === "doctor" &&
      String(appointment.doctorId) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    appointment.status = status;
    if (roomId) {
      appointment.roomId = roomId;
    }
    await appointment.save();

    return res.status(200).json({ appointment });
  } catch (error) {
    console.error("Update appointment status error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

