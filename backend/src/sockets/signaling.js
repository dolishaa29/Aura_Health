import { User } from "../models/User.js";
import { Appointment } from "../models/Appointment.js";

const userSocketMap = new Map(); 
const socketUserMap = new Map(); 
const pendingOffers = new Map(); 

export const getOnlineUsers = () => {
  return Array.from(userSocketMap.keys());
};

export const setupSignaling = (io) => {
  io.on("connection", async (socket) => {
    const { userId } = socket.handshake.query;

    if (userId) {
      userSocketMap.set(userId, socket.id);
      socketUserMap.set(socket.id, userId);
      try {
        await User.findByIdAndUpdate(userId, { isOnline: true });
      } catch (err) {
        console.error("Error updating user online status on connect:", err.message);
      }
      io.emit("user-online-status", { userId, isOnline: true });
    }

    socket.on("disconnect", async () => {
      const uid = socketUserMap.get(socket.id);
      if (uid) {
        userSocketMap.delete(uid);
        socketUserMap.delete(socket.id);
        try {
          await User.findByIdAndUpdate(uid, { isOnline: false });
        } catch (err) {
          console.error("Error updating user online status on disconnect:", err.message);
        }
        io.emit("user-online-status", { userId: uid, isOnline: false });
      }
    });
    socket.on("private-message", ({ toUserId, message }) => {
      const targetSocketId = userSocketMap.get(toUserId);
      const fromUserId = socketUserMap.get(socket.id);
      if (targetSocketId && fromUserId) {
        io.to(targetSocketId).emit("private-message", {
          fromUserId,
          message,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on("room-chat", ({ roomId, message }) => {
      if (!roomId || !message || typeof message !== "string") return;
      const fromUserId = socketUserMap.get(socket.id);
      if (!fromUserId) return;
      socket.to(roomId).emit("room-chat", {
        roomId,
        message: message.slice(0, 4000),
        fromUserId,
        timestamp: new Date().toISOString()
      });
    });

    socket.on("join-appointment-room", async ({ roomId, appointmentId }) => {
      socket.join(roomId);
      if (appointmentId) {
        try {
          await Appointment.findByIdAndUpdate(appointmentId, { roomId });
        } catch (err) {
          console.error("Error updating appointment roomId:", err.message);
        }
      }

      const pending = pendingOffers.get(roomId);
      if (pending) {
        socket.emit("webrtc-offer", pending);
      }

      socket.emit("joined-room", { roomId });
    });

    socket.on("webrtc-offer", ({ roomId, offer, fromUserId }) => {
      pendingOffers.set(roomId, { offer, fromUserId });
      socket.to(roomId).emit("webrtc-offer", { offer, fromUserId });
    });

    socket.on("webrtc-answer", ({ roomId, answer, fromUserId }) => {
      pendingOffers.delete(roomId);
      socket.to(roomId).emit("webrtc-answer", { answer, fromUserId });
    });

    socket.on("webrtc-ice-candidate", ({ roomId, candidate, fromUserId }) => {
      socket.to(roomId).emit("webrtc-ice-candidate", { candidate, fromUserId });
    });

    socket.on("appointment-status-updated", ({ appointmentId, status, doctorId, patientId }) => {
      [doctorId, patientId].forEach((uid) => {
        const sid = userSocketMap.get(String(uid));
        if (sid) {
          io.to(sid).emit("appointment-status-updated", { appointmentId, status });
        }
      });
    });
  });
};

