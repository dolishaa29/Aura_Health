import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  AlertTriangle,
  Camera,
  Mic,
  MicOff,
  PhoneCall,
  RefreshCw,
  Volume2,
  Loader2,
  Play,
  ArrowLeft,
  Send,
  Film,
  X
} from "lucide-react";

const captureFrame = (video) => {
  if (!video || video.videoWidth < 2 || video.videoHeight < 2) return null;
  /** HAVE_CURRENT_DATA (2)+ is ideal; some file codecs decode first frame only after a micro-seek */
  if (video.readyState < 2) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.72);
};

/**
 * @param {HTMLVideoElement} video
 * @returns {Promise<string | null>}
 */
const captureFrameWithRetry = async (video) => {
  let data = captureFrame(video);
  if (data) return data;
  if (!video) return null;
  const d = video.duration;
  if (!Number.isFinite(d) || d <= 0) return null;

  let target = Math.min(0.12, Math.max(0.001, d * 0.02));
  if (Math.abs(video.currentTime - target) < 0.02) {
    target = Math.min(d - 0.02, target + 0.15);
  }

  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadeddata", onSeeked);
      clearTimeout(tid);
      resolve(captureFrame(video));
    };
    const onSeeked = () => done();
    const tid = setTimeout(() => done(), 1200);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("loadeddata", onSeeked);
    try {
      video.currentTime = target;
    } catch {
      done();
    }
  });
};

function pickHinglishVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return (
    voices.find((v) => /hi[-_]IN/i.test(v.lang)) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("hi")) ||
    null
  );
}

/**
 * Single pass TTS — one utterance queue, stops when done (no accidental repeat loop).
 * While speaking, mic should stay paused (browser picks up speaker otherwise).
 */
function speakAssistant(text, onComplete) {
  if (!text?.trim() || !window.speechSynthesis) {
    onComplete?.();
    return;
  }
  window.speechSynthesis.cancel();
  const raw = text.replace(/\s+/g, " ").trim();
  const voice = pickHinglishVoice();
  const chunks = [];
  let buf = "";
  const parts = raw.split(/(?<=[.!?।,])\s+/);
  parts.forEach((p) => {
    const s = p.trim();
    if (!s) return;
    if ((buf + " " + s).length > 200) {
      if (buf) chunks.push(buf.trim());
      buf = s;
    } else {
      buf = buf ? `${buf} ${s}` : s;
    }
  });
  if (buf) chunks.push(buf.trim());
  if (chunks.length === 0) chunks.push(raw.slice(0, 500));

  let i = 0;
  const next = () => {
    if (i >= chunks.length) {
      onComplete?.();
      return;
    }
    const u = new SpeechSynthesisUtterance(chunks[i++]);
    u.lang = "hi-IN";
    if (voice) u.voice = voice;
    u.rate = 0.9;
    u.onend = () => setTimeout(next, 120);
    u.onerror = () => setTimeout(next, 120);
    window.speechSynthesis.speak(u);
  };
  next();
}

function buildSpeechFromGuidance(g) {
  if (!g) return "";
  const parts = [];
  if (g.situationSummary) parts.push(g.situationSummary);
  (g.immediateSteps || []).forEach((s, idx) => parts.push(`Step ${idx + 1}. ${s}`));
  if (g.voiceScript) parts.push(g.voiceScript);
  return parts.join(" ");
}

const SILENCE_AFTER_SPEECH_MS = 1900;
const RESUME_MIC_MS = 900;

/** @typedef {{ id: string, role: 'user' | 'assistant', text: string, source?: 'voice' | 'text' | 'video' }} ChatMsg */

const EmergencyMode = () => {
  const { token, user } = useAuth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const listeningRef = useRef(false);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const lastSceneSummaryRef = useRef("");
  const latestPhraseRef = useRef("");
  /** Builds one user utterance from consecutive finals until silence debounce fires */
  const voicePendingRef = useRef("");
  const voiceTurnTimerRef = useRef(null);
  const assistantSpeakingRef = useRef(false);
  const voiceBusyRef = useRef(false);
  const chatMessagesRef = useRef(/** @type {ChatMsg[]} */ ([]));
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileObjectUrlRef = useRef(null);

  const [camOn, setCamOn] = useState(false);
  const [uploadedVideoName, setUploadedVideoName] = useState(  /** @type {string | null} */ (null));
  const [listening, setListening] = useState(false);
  /** @type {[ChatMsg[], function]} */
  const [chatMessages, setChatMessages] = useState(/** @type {ChatMsg[]} */ ([]));
  const [interim, setInterim] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [guidance, setGuidance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assistantState, setAssistantState] = useState("idle");

  const syncTranscriptFromChat = useCallback((list) => {
    transcriptRef.current = list
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
      .join("\n");
  }, []);

  const pushMessage = useCallback(
    (role, text, extra = {}) => {
      const trimmed = String(text || "").trim();
      if (!trimmed) return;
      const msg = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        role,
        text: trimmed,
        ...extra
      };
      const next = [...chatMessagesRef.current, msg];
      chatMessagesRef.current = next;
      syncTranscriptFromChat(next);
      setChatMessages(next);
    },
    [syncTranscriptFromChat]
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, interim]);

  const revokeFileObjectUrl = useCallback(() => {
    if (fileObjectUrlRef.current) {
      URL.revokeObjectURL(fileObjectUrlRef.current);
      fileObjectUrlRef.current = null;
    }
  }, []);

  const clearUploadedVideo = useCallback(() => {
    revokeFileObjectUrl();
    setUploadedVideoName(null);
    const v = videoRef.current;
    if (v && !streamRef.current) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
  }, [revokeFileObjectUrl]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
  }, []);

  /** Live + file are mutually exclusive; clears file before starting camera. */
  const prepareVideoForLive = useCallback(() => {
    revokeFileObjectUrl();
    setUploadedVideoName(null);
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.removeAttribute("src");
      v.srcObject = null;
      v.load();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCamOn(false);
  }, [revokeFileObjectUrl]);

  const pauseMicForAssistant = useCallback(() => {
    assistantSpeakingRef.current = true;
    setAssistantState("speaking");
    if (voiceTurnTimerRef.current) {
      clearTimeout(voiceTurnTimerRef.current);
      voiceTurnTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
  }, []);

  const resumeMicAfterAssistant = useCallback(() => {
    assistantSpeakingRef.current = false;
    setAssistantState("idle");
    if (!listeningRef.current) return;
    setTimeout(() => {
      if (!listeningRef.current || assistantSpeakingRef.current) return;
      try {
        recognitionRef.current?.start();
      } catch {
        /* may need user gesture; ignore */
      }
    }, RESUME_MIC_MS);
  }, []);

  const startCamera = async () => {
    setError(null);
    prepareVideoForLive();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamOn(true);
    } catch (e) {
      setError("Camera unavailable.");
    }
  };

  const onPickVideoFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Please choose a video file.");
      return;
    }
    setError(null);
    stopCamera();
    revokeFileObjectUrl();
    setUploadedVideoName(file.name);
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = null;
    const url = URL.createObjectURL(file);
    fileObjectUrlRef.current = url;
    v.preload = "auto";
    v.src = url;
    v.load();

    v.addEventListener(
      "loadedmetadata",
      () => {
        const el = videoRef.current;
        if (!el || el.readyState >= 2) return;
        try {
          const dur = el.duration;
          const t =
            Number.isFinite(dur) && dur > 0 ? Math.min(0.08, dur * 0.02) : 0.08;
          el.currentTime = t;
        } catch {
          /* noop */
        }
      },
      { once: true }
    );

    void v.play().catch(() => {});
  };

  const removeUploadedVideo = () => {
    clearUploadedVideo();
  };

  const hasVideoSource = camOn || Boolean(uploadedVideoName);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    const loadVoices = () => pickHinglishVoice();
    loadVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (fileObjectUrlRef.current) {
        URL.revokeObjectURL(fileObjectUrlRef.current);
        fileObjectUrlRef.current = null;
      }
      listeningRef.current = false;
      if (voiceTurnTimerRef.current) clearTimeout(voiceTurnTimerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
      window.speechSynthesis?.cancel();
    };
  }, [stopCamera]);

  const runVoiceTurn = useCallback(async () => {
    if (assistantSpeakingRef.current || voiceBusyRef.current) return;
    const phrase = voicePendingRef.current.trim();
    if (phrase.length < 2) return;

    voicePendingRef.current = "";
    latestPhraseRef.current = "";

    voiceBusyRef.current = true;
    setVoiceLoading(true);
    setError(null);

    try {
      const priorTranscript = transcriptRef.current.slice(-2500);
      pushMessage("user", phrase, { source: "voice" });

      const res = await axios.post(
        "/emergency/voice-reply",
        {
          transcriptText: phrase,
          lastUtteranceOnly: true,
          conversationSoFar: priorTranscript,
          lastSceneSummary: lastSceneSummaryRef.current || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const replyText = (res.data.textReply || res.data.voiceScript || "").trim();
      const speak = (res.data.voiceScript || res.data.textReply || "").trim();
      if (replyText) {
        pushMessage("assistant", replyText, { source: "voice" });
      }
      if (!speak) {
        voiceBusyRef.current = false;
        setVoiceLoading(false);
        resumeMicAfterAssistant();
        return;
      }

      pauseMicForAssistant();
      speakAssistant(speak, () => {
        voiceBusyRef.current = false;
        setVoiceLoading(false);
        resumeMicAfterAssistant();
      });
    } catch (e) {
      setError(e?.response?.data?.message || "Request failed.");
      voiceBusyRef.current = false;
      setVoiceLoading(false);
      resumeMicAfterAssistant();
    }
  }, [token, pauseMicForAssistant, resumeMicAfterAssistant, pushMessage]);

  const scheduleVoiceTurn = useCallback(() => {
    if (assistantSpeakingRef.current || voiceBusyRef.current) return;
    if (voiceTurnTimerRef.current) clearTimeout(voiceTurnTimerRef.current);
    voiceTurnTimerRef.current = setTimeout(() => {
      voiceTurnTimerRef.current = null;
      if (assistantSpeakingRef.current || voiceBusyRef.current) return;
      runVoiceTurn();
    }, SILENCE_AFTER_SPEECH_MS);
  }, [runVoiceTurn]);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("Use Chrome for voice.");
      return;
    }
    const rec = new SR();
    rec.lang = "hi-IN";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      if (assistantSpeakingRef.current || voiceBusyRef.current) return;

      let interimText = "";
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalChunk += piece;
        else interimText += piece;
      }

      if (finalChunk.trim()) {
        const add = finalChunk.trim();
        voicePendingRef.current = voicePendingRef.current
          ? `${voicePendingRef.current} ${add}`
          : add;
        latestPhraseRef.current = voicePendingRef.current;
        scheduleVoiceTurn();
      }
      setInterim(interimText.trim());
    };

    rec.onerror = () => {
      if (listeningRef.current && !assistantSpeakingRef.current && !voiceBusyRef.current) {
        setTimeout(() => {
          try {
            rec.start();
          } catch {
            setListening(false);
          }
        }, 350);
      }
    };

    rec.onend = () => {
      if (listeningRef.current && !assistantSpeakingRef.current && !voiceBusyRef.current) {
        setTimeout(() => {
          try {
            rec.start();
          } catch {
            setListening(false);
          }
        }, 250);
      }
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stopListening = () => {
    listeningRef.current = false;
    if (voiceTurnTimerRef.current) clearTimeout(voiceTurnTimerRef.current);
    voiceTurnTimerRef.current = null;
    voicePendingRef.current = "";
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    recognitionRef.current = null;
    setListening(false);
    setInterim("");
  };

  const sendTextMessage = async () => {
    const text = chatDraft.trim();
    if (text.length < 2) return;
    if (voiceBusyRef.current || assistantSpeakingRef.current) return;

    setChatDraft("");
    const priorTranscript = transcriptRef.current.slice(-2500);
    pushMessage("user", text, { source: "text" });

    voiceBusyRef.current = true;
    setVoiceLoading(true);
    setError(null);

    if (voiceTurnTimerRef.current) {
      clearTimeout(voiceTurnTimerRef.current);
      voiceTurnTimerRef.current = null;
    }
    voicePendingRef.current = "";
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }

    try {
      const res = await axios.post(
        "/emergency/voice-reply",
        {
          transcriptText: text,
          lastUtteranceOnly: true,
          conversationSoFar: priorTranscript,
          lastSceneSummary: lastSceneSummaryRef.current || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const replyText = (res.data.textReply || res.data.voiceScript || "").trim();
      const speak = (res.data.voiceScript || res.data.textReply || "").trim();
      if (replyText) {
        pushMessage("assistant", replyText, { source: "text" });
      }
      if (!speak) {
        voiceBusyRef.current = false;
        setVoiceLoading(false);
        if (listeningRef.current) {
          setTimeout(() => {
            try {
              recognitionRef.current?.start();
            } catch {
              /* noop */
            }
          }, RESUME_MIC_MS);
        }
        return;
      }

      pauseMicForAssistant();
      speakAssistant(speak, () => {
        voiceBusyRef.current = false;
        setVoiceLoading(false);
        resumeMicAfterAssistant();
      });
    } catch (e) {
      setError(e?.response?.data?.message || "Request failed.");
      voiceBusyRef.current = false;
      setVoiceLoading(false);
      if (listeningRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch {
            /* noop */
          }
        }, RESUME_MIC_MS);
      }
    }
  };

  const analyze = async () => {
    const video = videoRef.current;
    let dataUrl = captureFrame(video);
    if (!dataUrl && video) {
      dataUrl = await captureFrameWithRetry(video);
    }
    if (!dataUrl) {
      setError(
        "Could not read a video frame. Press play on the clip, seek to a clear frame, then try again."
      );
      return;
    }
    voiceBusyRef.current = true;
    if (voiceTurnTimerRef.current) {
      clearTimeout(voiceTurnTimerRef.current);
      voiceTurnTimerRef.current = null;
    }
    voicePendingRef.current = "";
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(
        "/emergency/guidance",
        {
          imageData: dataUrl,
          mimeType: "image/jpeg",
          transcriptText: `${transcriptRef.current} ${interim}`.slice(-2000)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const g = res.data.guidance;
      setGuidance(g);
      const scene = [g.situationSummary, ...(g.immediateSteps || []).slice(0, 3)]
        .filter(Boolean)
        .join(" | ");
      lastSceneSummaryRef.current = scene.slice(0, 1200);

      const chatAssistant =
        (g.voiceScript && g.voiceScript.trim()) ||
        [g.situationSummary, ...(g.immediateSteps || []).map((s, i) => `${i + 1}. ${s}`)]
          .filter(Boolean)
          .join("\n");
      if (chatAssistant) {
        pushMessage("assistant", chatAssistant, { source: "video" });
      }

      const speechText = buildSpeechFromGuidance(g);
      pauseMicForAssistant();
      speakAssistant(speechText, () => {
        voiceBusyRef.current = false;
        resumeMicAfterAssistant();
      });
    } catch (e) {
      setError(e?.response?.data?.message || "Analysis failed.");
      voiceBusyRef.current = false;
      if (listeningRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch {
            /* noop */
          }
        }, RESUME_MIC_MS);
      }
    } finally {
      setLoading(false);
    }
  };

  const replayGuidanceAudio = () => {
    if (!guidance) return;
    pauseMicForAssistant();
    speakAssistant(buildSpeechFromGuidance(guidance), () => resumeMicAfterAssistant());
  };

  const dashPath = user?.role === "doctor" ? "/doctor" : "/patient";

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">Emergency triage assist</h1>
            <p className="text-xs text-slate-500 mt-1">
              Not a diagnosis. For emergencies, contact local emergency services.
            </p>
          </div>
          <Link
            to={dashPath}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Exit
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-slate-800 bg-black aspect-video overflow-hidden relative">
          <video
            ref={videoRef}
            className={`w-full h-full ${uploadedVideoName ? "object-contain" : "object-cover"}`}
            playsInline
            muted
            preload="auto"
            controls={Boolean(uploadedVideoName)}
          />
          {!hasVideoSource && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-900 text-sm text-slate-500 px-4 text-center">
              <span>No video source</span>
              <span className="text-xs text-slate-600">Use live camera or upload a recorded video</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={onPickVideoFile}
          />
          {!camOn ? (
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white hover:bg-slate-700/80"
            >
              <Camera className="h-4 w-4" />
              Start camera
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300"
            >
              Stop camera
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white hover:bg-slate-700/80"
          >
            <Film className="h-4 w-4" />
            Upload video
          </button>
          {uploadedVideoName && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 max-w-[200px]">
              <span className="truncate" title={uploadedVideoName}>
                {uploadedVideoName}
              </span>
              <button
                type="button"
                onClick={removeUploadedVideo}
                className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-white shrink-0"
                aria-label="Remove video"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {!listening ? (
            <button
              type="button"
              onClick={startListening}
              disabled={assistantState === "speaking"}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white disabled:opacity-50"
            >
              <Mic className="h-4 w-4" />
              Microphone
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListening}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 border border-rose-900/50 text-sm text-rose-200"
            >
              <MicOff className="h-4 w-4" />
              Mute mic
            </button>
          )}
          <button
            type="button"
            onClick={analyze}
            disabled={loading || !hasVideoSource || assistantState === "speaking"}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-slate-950 text-sm font-medium disabled:opacity-40"
            title={!hasVideoSource ? "Camera or video file required" : undefined}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Analyze video
          </button>
          {assistantState === "speaking" && (
            <span className="text-xs text-slate-500">Assistant speaking…</span>
          )}
          {voiceLoading && assistantState !== "speaking" && (
            <span className="text-xs text-slate-500">Processing…</span>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/20 flex flex-col max-h-[min(420px,50vh)]">
          <div className="px-3 py-2 border-b border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Conversation
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[140px]">
            {chatMessages.length === 0 && !interim && (
              <p className="text-xs text-slate-600 text-center py-6">
                Analyze video to start, then use voice or type below.
              </p>
            )}
            {chatMessages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-slate-700 text-slate-100"
                      : "bg-slate-800/80 text-slate-200 border border-slate-700/60"
                  }`}
                >
                  {m.role === "assistant" && (
                    <span className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                      Assistant
                      {m.source === "video"
                        ? " · video"
                        : m.source === "voice"
                          ? " · voice"
                          : m.source === "text"
                            ? " · reply"
                            : ""}
                    </span>
                  )}
                  {m.role === "user" && (
                    <span className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">
                      You{m.source === "voice" ? " · voice" : m.source === "text" ? " · typed" : ""}
                    </span>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                </div>
              </div>
            ))}
            {listening && interim && (
              <div className="flex justify-end">
                <div className="max-w-[90%] rounded-lg px-3 py-2 text-sm bg-slate-700/50 text-slate-400 border border-dashed border-slate-600">
                  <span className="text-[10px] uppercase tracking-wide block mb-1">Listening…</span>
                  {interim}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendTextMessage();
                }
              }}
              placeholder="Type a message…"
              disabled={voiceLoading || assistantState === "speaking" || loading}
              className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={sendTextMessage}
              disabled={
                chatDraft.trim().length < 2 ||
                voiceLoading ||
                assistantState === "speaking" ||
                loading
              }
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white text-slate-950 text-sm font-medium disabled:opacity-40 shrink-0"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-amber-600 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {guidance && (
          <div className="mt-8 space-y-4 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded ${
                  guidance.severity === "critical" || guidance.severity === "high"
                    ? "bg-red-950/50 text-red-300"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {guidance.severity}
              </span>
              <button
                type="button"
                onClick={replayGuidanceAudio}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
              >
                <Play className="h-3.5 w-3.5" />
                Replay audio
              </button>
            </div>
            {guidance.callEmergencyServices && (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <PhoneCall className="h-4 w-4" />
                Contact emergency services if indicated.
              </p>
            )}
            <p className="text-sm text-slate-200 leading-relaxed">{guidance.situationSummary}</p>
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Steps</h2>
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-300">
                {(guidance.immediateSteps || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
            {guidance.doNotDo?.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-red-400/80 uppercase tracking-wide mb-2">Avoid</h2>
                <ul className="list-disc list-inside text-sm text-slate-500 space-y-1">
                  {guidance.doNotDo.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-start gap-2 pt-3 border-t border-slate-800">
              <Volume2 className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-400">{guidance.voiceScript}</p>
            </div>
            <p className="text-[10px] text-slate-600">{guidance.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyMode;
