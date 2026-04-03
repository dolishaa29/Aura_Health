import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getSocket } from "../services/socket.js";
import { Video, Upload, Mic, MicOff, MessageCircle, PhoneOff } from "lucide-react";

const STUN_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

const VideoCall = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const localVideoRef = useRef(null);
  const fileVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const fileObjectUrlRef = useRef(null);

  const [status, setStatus] = useState("Initializing...");
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [sourceMode, setSourceMode] = useState("live");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [fileName, setFileName] = useState("");

  const attachLocalPreview = useCallback((stream) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket(user.id);

    const createPeerConnection = () => {
      if (pcRef.current) return pcRef.current;
      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc-ice-candidate", {
            roomId,
            candidate: event.candidate,
            fromUserId: user.id
          });
        }
      };
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };
      pcRef.current = pc;
      return pc;
    };

    const startLiveStream = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localStreamRef.current = stream;
      attachLocalPreview(stream);
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    };

    const handleOffer = async ({ offer, fromUserId }) => {
      if (fromUserId === user.id) return;
      if (!localStreamRef.current) return;
      const pc = pcRef.current || createPeerConnection();
      setStatus("Connecting…");
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { roomId, answer, fromUserId: user.id });
      setStatus("In call");
    };

    const handleAnswer = async ({ answer, fromUserId }) => {
      if (fromUserId === user.id) return;
      setStatus("Connecting…");
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      setStatus("In call");
    };

    const handleIceCandidate = async ({ candidate, fromUserId }) => {
      if (fromUserId === user.id) return;
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("ICE error", err);
      }
    };

    const handleRoomChat = (payload) => {
      if (payload.roomId !== roomId) return;
      setChatMessages((prev) => [...prev, payload]);
    };

    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice-candidate", handleIceCandidate);
    socket.on("room-chat", handleRoomChat);

    let cancelled = false;

    (async () => {
      try {
        setStatus("Getting camera & mic…");
        await startLiveStream();
        if (cancelled) return;

        setStatus("Joining room…");
        socket.emit("join-appointment-room", { roomId });

        if (user.role === "doctor") {
          setStatus("Calling…");
          const pc = pcRef.current;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc-offer", { roomId, offer, fromUserId: user.id });
        } else {
          setStatus("Waiting for doctor…");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setStatus("Camera/mic blocked or unavailable");
      }
    })();

    return () => {
      cancelled = true;
      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("webrtc-ice-candidate", handleIceCandidate);
      socket.off("room-chat", handleRoomChat);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (fileObjectUrlRef.current) {
        URL.revokeObjectURL(fileObjectUrlRef.current);
        fileObjectUrlRef.current = null;
      }
    };
  }, [roomId, user?.id, user?.role, attachLocalPreview]);

  const replaceVideoTrack = async (newVideoTrack) => {
    const pc = pcRef.current;
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender && newVideoTrack) {
      await sender.replaceTrack(newVideoTrack);
    }
  };

  const switchToLiveCamera = async () => {
    try {
      if (fileObjectUrlRef.current) {
        URL.revokeObjectURL(fileObjectUrlRef.current);
        fileObjectUrlRef.current = null;
      }
      if (fileVideoRef.current) {
        fileVideoRef.current.pause();
        fileVideoRef.current.removeAttribute("src");
      }

      const audios = localStreamRef.current?.getAudioTracks() || [];
      localStreamRef.current?.getVideoTracks().forEach((t) => t.stop());

      const vidStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      const newV = vidStream.getVideoTracks()[0];
      await replaceVideoTrack(newV);

      const merged = new MediaStream([newV, ...audios]);
      localStreamRef.current = merged;
      attachLocalPreview(merged);

      setSourceMode("live");
      setFileName("");
      setIsVideoOff(false);
      setStatus("In call — live camera");
    } catch (e) {
      console.error(e);
      setStatus("Could not start camera");
    }
  };

  const onPickVideoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("video/")) return;
    if (file.size > 120 * 1024 * 1024) {
      setStatus("File too large (max ~120MB)");
      return;
    }

    try {
      if (fileObjectUrlRef.current) {
        URL.revokeObjectURL(fileObjectUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      fileObjectUrlRef.current = url;

      const el = fileVideoRef.current;
      if (!el) return;
      el.src = url;
      el.muted = true;
      await el.play();

      const cap = el.captureStream();
      const vTrack = cap.getVideoTracks()[0];
      if (!vTrack) {
        setStatus("Could not read video");
        return;
      }

      const audios = localStreamRef.current?.getAudioTracks() || [];
      localStreamRef.current?.getVideoTracks().forEach((t) => t.stop());
      await replaceVideoTrack(vTrack);

      const merged = new MediaStream([vTrack, ...audios]);
      localStreamRef.current = merged;
      attachLocalPreview(merged);

      setSourceMode("file");
      setFileName(file.name);
      setStatus("Sharing file video");
    } catch (err) {
      console.error(err);
      setStatus("Could not play this video");
    }
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length === 0) return;
    const next = !isAudioMuted;
    audioTracks.forEach((t) => {
      t.enabled = !next;
    });
    setIsAudioMuted(next);
  };

  const toggleVideo = () => {
    if (sourceMode === "file") return;
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length === 0) return;
    const next = !isVideoOff;
    videoTracks.forEach((t) => {
      t.enabled = !next;
    });
    setIsVideoOff(next);
  };

  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg || !user?.id) return;
    const socket = getSocket(user.id);
    socket.emit("room-chat", { roomId, message: msg });
    setChatMessages((prev) => [
      ...prev,
      {
        roomId,
        message: msg,
        fromUserId: user.id,
        timestamp: new Date().toISOString()
      }
    ]);
    setChatInput("");
  };

  const endCall = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (fileObjectUrlRef.current) {
      URL.revokeObjectURL(fileObjectUrlRef.current);
    }
    window.history.back();
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col bg-slate-950">
      <div className="border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Room</p>
          <p className="text-sm font-mono text-slate-300 truncate max-w-[200px] sm:max-w-md">{roomId}</p>
          <p className="text-xs text-emerald-500/80 mt-0.5">{status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (sourceMode === "file") switchToLiveCamera();
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ${
              sourceMode === "live"
                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            Live camera
          </button>
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer">
            <Upload className="h-3.5 w-3.5" />
            Upload video
            <input type="file" accept="video/*" className="hidden" onChange={onPickVideoFile} />
          </label>
        </div>
      </div>

      {fileName && (
        <p className="px-4 py-1 text-xs text-amber-400/90 bg-amber-950/20 border-b border-amber-900/30">
          Playing: {fileName} — remote sees this instead of your camera. Mic stays live for voice chat.
        </p>
      )}

      <video ref={fileVideoRef} className="hidden" playsInline muted />

      <div className="relative max-w-6xl mx-auto w-full px-4 py-4 flex flex-col lg:flex-row gap-4 flex-1">
        <div className="flex-1 grid md:grid-cols-2 gap-3 min-h-[200px]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-col">
            <p className="text-xs text-slate-500 mb-1 px-1">You</p>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full flex-1 min-h-[180px] rounded-xl bg-black object-cover"
            />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-col">
            <p className="text-xs text-slate-500 mb-1 px-1">Remote</p>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full flex-1 min-h-[180px] rounded-xl bg-black object-cover"
            />
          </div>
        </div>

        <div className="w-full lg:w-80 flex flex-col border border-slate-800 rounded-2xl bg-slate-900/80 overflow-hidden shrink-0">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2 text-sm text-slate-300">
            <MessageCircle className="h-4 w-4 text-emerald-400" />
            Chat
          </div>
          <div className="flex-1 min-h-[180px] max-h-[240px] overflow-y-auto p-3 space-y-2 text-sm">
            {chatMessages.length === 0 && (
              <p className="text-xs text-slate-600">Messages only for this call.</p>
            )}
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg px-2 py-1.5 ${
                  m.fromUserId === user.id
                    ? "bg-emerald-500/20 text-emerald-100 ml-4"
                    : "bg-slate-800 text-slate-200 mr-4"
                }`}
              >
                <p>{m.message}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {new Date(m.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-slate-800 flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Type a message…"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm"
            />
            <button
              type="button"
              onClick={sendChat}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur px-4 py-4 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={toggleMute}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
            isAudioMuted ? "bg-rose-600/80 text-white" : "bg-slate-800 text-slate-100"
          }`}
        >
          {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {isAudioMuted ? "Unmute" : "Mute"}
        </button>
        <button
          type="button"
          onClick={toggleVideo}
          disabled={sourceMode === "file"}
          className="px-4 py-2.5 rounded-xl bg-slate-800 text-sm text-slate-100 disabled:opacity-40"
        >
          {isVideoOff ? "Camera on" : "Camera off"}
        </button>
        <button
          type="button"
          onClick={endCall}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium"
        >
          <PhoneOff className="h-4 w-4" />
          End
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
