import { useEffect, useState } from "react";
import { getSocket } from "../services/socket.js";

/**
 * Doctor–patient private chat over the same socket event used elsewhere.
 * Keeps message list + send logic in one place so pages stay easy to read.
 */
export function usePrivateChat(userId) {
  const [chatTarget, setChatTarget] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket(userId);
    const onMessage = ({ fromUserId, message, timestamp }) => {
      setChatMessages((prev) => [...prev, { fromUserId, message, timestamp }]);
    };
    socket.on("private-message", onMessage);
    return () => socket.off("private-message", onMessage);
  }, [userId]);

  const sendChat = () => {
    if (!chatTarget || !chatInput.trim() || !userId) return;
    const socket = getSocket(userId);
    if (!socket) return;
    const message = chatInput.trim();
    socket.emit("private-message", { toUserId: chatTarget, message });
    setChatMessages((prev) => [
      ...prev,
      { fromUserId: userId, message, timestamp: new Date().toISOString() }
    ]);
    setChatInput("");
  };

  return {
    chatTarget,
    setChatTarget,
    chatInput,
    setChatInput,
    chatMessages,
    sendChat
  };
}
