// TherapistRobot.jsx
// Single-file React component
// Requirements: Tailwind CSS, recharts, lucide-react
// npm i recharts lucide-react
// Put your Gemini API key in GEMINI_API_KEY below.

import React, { useEffect, useRef, useState } from "react";
import { MessageCircleHeart, Send, BarChart3, ArrowLeft } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// ==== CONFIG ====
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// face-api.js (loaded dynamically)
const FACE_API_URL =
  "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";

// Expressions from face-api: neutral, happy, sad, angry, fearful, disgusted, surprised
const EMOTION_PALETTE = {
  happy: "#34d399",
  neutral: "#94a3b8",
  sad: "#60a5fa",
  angry: "#f87171",
  fearful: "#a78bfa",
  disgusted: "#84cc16",
  surprised: "#fbbf24",
};
const PIE_COLORS = Object.values(EMOTION_PALETTE);

// Helper: truncate & sanitize
const clip = (s, n = 280) => (s.length > n ? s.slice(0, n) + "…" : s);

// ==== MAIN COMPONENT ====
export default function TherapistRobot() {
  // Views: "chat" (default) or "dashboard"
  const [view, setView] = useState("chat");

  // Chat state
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "hey, i'm here for you 💬 how are you feeling today? share anything — no judgment.",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  // Background emotion detection (hidden webcam)
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [lastEmotion, setLastEmotion] = useState("neutral");
  const [lastConfidence, setLastConfidence] = useState(0);
  const [emotionEvents, setEmotionEvents] = useState(() => {
    // persist across reloads
    try {
      const raw = localStorage.getItem("emotion-events");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Persist emotion events
  useEffect(() => {
    localStorage.setItem("emotion-events", JSON.stringify(emotionEvents));
  }, [emotionEvents]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const ctrl = isMac ? e.metaKey : e.ctrlKey;

      if (ctrl && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setView("dashboard");
      } else if (e.key === "Escape") {
        setView("chat");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Load face-api.js and run hidden detection loop
  useEffect(() => {
    let stream;
    let rafId;

    (async () => {
      // load script if needed
      if (!window.faceapi) {
        await new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = FACE_API_URL;
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }

      const faceapi = window.faceapi;
      // Load models
      const MODEL_URI =
        "https://justadudewhohacks.github.io/face-api.js/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URI);
      setModelsLoaded(true);

      // Start cam
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera permission denied or not available:", err);
        // No camera, just skip detection.
        return;
      }

      const detectLoop = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) {
          rafId = requestAnimationFrame(detectLoop);
          return;
        }

        // Ensure dimensions
        const W = 320;
        const H = 240;
        if (canvas.width !== W) canvas.width = W;
        if (canvas.height !== H) canvas.height = H;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, W, H);

        try {
          const detection = await faceapi
            .detectSingleFace(
              video,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })
            )
            .withFaceLandmarks()
            .withFaceExpressions();

          if (detection?.expressions) {
            const [emotion, conf] = Object.entries(
              detection.expressions
            ).reduce((a, b) => (a[1] > b[1] ? a : b));
            setLastEmotion(emotion);
            setLastConfidence(conf);

            // Only log if confidence meaningful and not neutral noise
            if (conf >= 0.6) {
              const ts = Date.now();
              setEmotionEvents((prev) => [
                ...prev,
                { emotion, confidence: conf, ts },
              ]);
            }
          }
        } catch {}

        rafId = requestAnimationFrame(detectLoop);
      };

      videoRef.current.onloadeddata = () => {
        rafId = requestAnimationFrame(detectLoop);
      };
    })();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      try {
        if (stream) stream.getTracks().forEach((t) => t.stop());
      } catch {
        console.log("Error stopping video stream");
      }
    };
  }, []);

  // ==== Chat sending via Gemini 1.5 (friend/therapist tone) ====
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg = { sender: "user", text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);

    // lightweight sentiment signal from text for logging as well
    const simpleSentiment = deriveTextEmotion(text);

    // log a synthetic event from text to support charts if camera is off
    if (simpleSentiment) {
      setEmotionEvents((prev) => [
        ...prev,
        { emotion: simpleSentiment, confidence: 0.7, ts: Date.now() },
      ]);
    }

    try {
      if (!GEMINI_API_KEY) {
        throw new Error("Missing API key");
      }

      console.log("Making request to:", GEMINI_URL);

      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Gemini API error:", errorData);
        throw new Error(errorData.error?.message || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "i'm here with you. let’s take one small step — can we try one deep breath together right now? 🌿";

      setMessages((m) => [
        ...m,
        { sender: "bot", text: reply, ts: Date.now() },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          sender: "bot",
          text: "hmm, i'm having trouble reaching my brain right now 😅 could you try again in a moment?",
          ts: Date.now(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  // ==== Dashboard data (Daily / Weekly / Monthly) ====
  const now = Date.now();
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const dailyData = toPieData(emotionEvents.filter((e) => e.ts >= dayStart));
  const weeklyData = toPieData(emotionEvents.filter((e) => e.ts >= weekStart));
  const monthlyData = toPieData(
    emotionEvents.filter((e) => e.ts >= monthStart)
  );

  // ==== UI ====
  if (view === "dashboard") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-600/20 border border-cyan-400/40">
                <BarChart3 className="text-cyan-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-cyan-300">
                  Emotion Analytics
                </h1>
                <p className="text-sm text-gray-400">
                  Daily, Weekly, Monthly averages (from background signals)
                </p>
              </div>
            </div>
            <button
              onClick={() => setView("chat")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15"
              title="Esc"
            >
              <ArrowLeft size={16} />
              Back to Chat
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PieCard title="Today" data={withFallback(dailyData)} />
            <PieCard title="This Week" data={withFallback(weeklyData)} />
            <PieCard title="This Month" data={withFallback(monthlyData)} />
          </div>

          <p className="mt-6 text-xs text-gray-500">
            Tip: Press{" "}
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Esc</kbd> to
            return to the chat.
          </p>
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-sky-950 to-cyan-900 flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-lg h-[740px] bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl p-5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 shadow-lg">
              <MessageCircleHeart size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Therapy Friend</h2>
              <p className="text-xs text-gray-300">
                tuned to your vibe — currently sensing:{" "}
                <span
                  className="font-semibold"
                  style={{ color: EMOTION_PALETTE[lastEmotion] || "#e5e7eb" }}
                >
                  {pretty(lastEmotion)}{" "}
                  {lastConfidence
                    ? `(${Math.round(lastConfidence * 100)}%)`
                    : ""}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setView("dashboard")}
            className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm"
            title="Ctrl/⌘ + Shift + D"
          >
            <BarChart3 size={16} />
            Dashboard
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.sender === "user"
                    ? "bg-gradient-to-r from-blue-600 to-purple-600"
                    : "bg-white/15 border border-white/10"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="text-gray-300 text-sm italic">typing…</div>
          )}
        </div>

        {/* Input */}
        <div className="mt-4 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="share your thoughts…"
            className="flex-1 px-4 py-2 rounded-full bg-white/15 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <button
            onClick={sendMessage}
            className="p-3 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 hover:scale-105 transition"
            title="Send"
          >
            <Send size={18} />
          </button>
        </div>

        <p className="mt-3 text-[11px] text-gray-400">
          Shortcut: <kbd className="px-1 bg-white/10 rounded">Ctrl/⌘</kbd> +{" "}
          <kbd className="px-1 bg-white/10 rounded">Shift</kbd> +{" "}
          <kbd className="px-1 bg-white/10 rounded">D</kbd> → Dashboard •{" "}
          <kbd className="px-1 bg-white/10 rounded">Esc</kbd> → Back
        </p>
      </div>

      {/* Hidden video & canvas for background detection (not shown to users) */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
      />
      <canvas
        ref={canvasRef}
        style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
      />
    </div>
  );
}

// ===== UI Fragments =====
function PieCard({ title, data }) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-cyan-400/30">
      <h3 className="text-center font-semibold mb-3">{title}</h3>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(17,24,39,0.9)",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={
                    EMOTION_PALETTE[entry.name.toLowerCase()] ||
                    PIE_COLORS[idx % PIE_COLORS.length]
                  }
                />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {sumValues(data) === 0 && (
        <p className="text-center text-xs text-gray-400 mt-2">
          no signals yet — try chatting or enable camera permissions
        </p>
      )}
    </div>
  );
}

// ===== Helpers =====
function pretty(e) {
  if (!e) return "—";
  return e[0].toUpperCase() + e.slice(1);
}

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return +d;
}
function startOfWeek(ts) {
  const d = new Date(ts);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = day === 0 ? 6 : day - 1; // week starts Monday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return +d;
}
function startOfMonth(ts) {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return +d;
}

function toPieData(events) {
  const counts = {
    happy: 0,
    neutral: 0,
    sad: 0,
    angry: 0,
    fearful: 0,
    disgusted: 0,
    surprised: 0,
  };
  for (const e of events) {
    const key = (e.emotion || "neutral").toLowerCase();
    if (counts[key] !== undefined) counts[key] += 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts)
    .map(([name, value]) => ({ name: pretty(name), value }))
    .filter((d) => total === 0 || d.value > 0);
}

function withFallback(data) {
  if (!data || data.length === 0) {
    return [
      { name: "Neutral", value: 1 },
      { name: "Happy", value: 1 },
      { name: "Sad", value: 1 },
    ];
  }
  return data;
}

function sumValues(data) {
  return data.reduce((a, b) => a + (b.value || 0), 0);
}

function deriveTextEmotion(text = "") {
  const t = text.toLowerCase();
  const map = [
    [
      "happy",
      ["better", "relieved", "grateful", "calmer", "okay", "good", "hopeful"],
    ],
    ["sad", ["sad", "down", "depressed", "upset", "cry", "lonely", "hurt"]],
    [
      "angry",
      ["angry", "mad", "furious", "irritated", "annoyed", "frustrated"],
    ],
    ["fearful", ["anxious", "scared", "afraid", "panic", "nervous", "worried"]],
    ["disgusted", ["disgust", "gross", "nasty"]],
    ["surprised", ["surprised", "shocked", "wow"]],
    ["neutral", ["meh", "idk", "fine"]],
  ];
  for (const [emo, words] of map) {
    if (words.some((w) => t.includes(w))) return emo;
  }
  return null;
}

function buildTherapistSystemPrompt(lastEmotion, confidence) {
  const friendly = {
    happy:
      "They seem brighter right now — keep momentum while staying grounded and not dismissing earlier struggles.",
    neutral:
      "They seem steady or unreadable — reflect, validate, and gently invite specifics without pressure.",
    sad: "Their facial cues suggest sadness — be tender, validate, normalize tears, and offer one tiny next step.",
    angry:
      "They seem angry — acknowledge the energy without judgment, prioritize safety, and invite naming triggers.",
    fearful:
      "They appear anxious — slow the pace, suggest one breathing or grounding step, and keep sentences short.",
    disgusted:
      "They show aversion — validate boundaries, explore needs gently, avoid moralizing.",
    surprised:
      "They look surprised — check in about what shifted, stay curious and warm.",
  };
  const line =
    friendly[lastEmotion] ||
    "Keep responses warm, validating, and non-judgmental.";
  const confTxt =
    confidence && confidence >= 0.6
      ? ` (signal confidence ~${Math.round(confidence * 100)}%)`
      : "";
  return `You are a kind, emotionally intelligent friend and therapist hybrid. Respond with high empathy, simple language, and actionable micro-steps. Adapt tone to live emotional signals: currently "${lastEmotion}"${confTxt}. ${line}`;
}
