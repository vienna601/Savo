// TherapistRobot.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MessageCircleHeart, Mic, Send, BarChart3, ArrowLeft } from "lucide-react";

// ==== CONFIG ====
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent";

// face-api.js (loaded dynamically)
const FACE_API_URL =
  "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";

// Expressions from face-api: neutral, happy, sad, angry, fearful, disgusted, surprised

const EMOTION_PALETTE = {
  frustrated: "#34d399",
  grief: "#94a3b8",
  angry: "#f87171",
  anxious: "#a78bfa",
  disgusted: "#84cc16",
  irritated: "#fbbf24",
};
const PIE_COLORS = Object.values(EMOTION_PALETTE);

// Helper to convert emotion object to pie data
const toPieData = (obj) =>
  Object.entries(obj).map(([name, value]) => ({ name, value }));

// Helper functions
const buildTherapistSystemPrompt = (emotion, confidence) => {
  return `You are a warm, empathetic therapist friend. The user is currently feeling ${emotion} with ${Math.round(confidence * 100)}% confidence. Respond with compassion and understanding. Keep responses brief (1-3 sentences) and conversational.`;
};

const deriveTextEmotion = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes("sad") || lower.includes("depressed")) return "sad";
  if (lower.includes("angry") || lower.includes("mad")) return "angry";
  if (lower.includes("anxious") || lower.includes("worried")) return "anxious";
  if (lower.includes("happy") || lower.includes("great")) return "happy";
  return null;
};

const startOfDay = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const startOfWeek = (ts) => {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const startOfMonth = (ts) => {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const pretty = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const withFallback = (data) => {
  if (!data || data.length === 0) {
    return [{ name: "No data", value: 1 }];
  }
  return data;
};

const aggregateEmotions = (events) => {
  const counts = {};
  events.forEach((e) => {
    counts[e.emotion] = (counts[e.emotion] || 0) + 1;
  });
  return counts;
};

// PieCard component
const PieCard = ({ title, data }) => (
  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
    <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={70}
          label={({ name, percent }) =>
            percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
          }
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={PIE_COLORS[index % PIE_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

export default function TherapistRobot() {
  const [view, setView] = useState("chat");
  const navigate = useNavigate();
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

  const [recording, setRecording] = useState(false);
  let mediaRecorderRef = useRef(null);
  let audioChunksRef = useRef([]);

  //recording functions
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: "audio/webm",
    });

    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      const formData = new FormData();
      formData.append("audio", audioBlob, "input.webm");

      const res = await fetch("http://localhost:8080/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("👉 Transcribed:", data.text);
      setInput(data.text);
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const shortcutHandler = (e) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const ctrl = isMac ? e.metaKey : e.ctrlKey;

      if (ctrl && e.shiftKey && e.key.toLowerCase() === "e") {
        navigate("/admin");
      }

      if (e.key === "Escape" && view === "dashboard") {
        setView("chat");
      }
    };

    window.addEventListener("keydown", shortcutHandler);
    return () => window.removeEventListener("keydown", shortcutHandler);
  }, [navigate, view]);

  // Load face-api.js and run hidden detection loop
  useEffect(() => {
  let stream;
  let rafId;

  (async () => {
    // Load face-api script if needed
    if (!window.faceapi) {
      await new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = FACE_API_URL;
        script.onload = resolve;
        document.body.appendChild(script);
      });
    }

    const faceapi = window.faceapi;
    const MODEL_URI =
      "https://justadudewhohacks.github.io/face-api.js/models";
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URI);
    setModelsLoaded(true);

    // Start camera
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera permission denied or unavailable:", err);
      return;
    }

    const detectLoop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        rafId = requestAnimationFrame(detectLoop);
        return;
      }

      const W = 320;
      const H = 240;
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, W, H);

      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
          .withFaceLandmarks()
          .withFaceExpressions();

        if (detection?.expressions) {
          const [emotion, conf] = Object.entries(detection.expressions)
            .reduce((a, b) => (a[1] > b[1] ? a : b));
          setLastEmotion(emotion);
          setLastConfidence(conf);

          if (conf >= 0.6) {
            const ts = Date.now();
            setEmotionEvents((prev) => [...prev, { emotion, confidence: conf, ts }]);
          }
        }
      } catch {}

      rafId = requestAnimationFrame(detectLoop);
    };

    // Only attach onloadeddata if videoRef.current exists
    const video = videoRef.current;
    if (video) {
      video.onloadeddata = () => {
        rafId = requestAnimationFrame(detectLoop);
      };
    }
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

  const simpleSentiment = deriveTextEmotion(text);
  if (simpleSentiment) {
    setEmotionEvents((prev) => [
      ...prev,
      { emotion: simpleSentiment, confidence: 0.7, ts: Date.now() },
    ]);
  }

    const systemTone = buildTherapistSystemPrompt(lastEmotion, lastConfidence);

    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-1.0-pro",
          contents: [
            {
              role: "user",
              parts: [{ text: systemTone }],
            },
            {
              role: "model",
              parts: [
                { text: "I understand. I'll adapt my responses accordingly." },
              ],
            },
            {
              role: "user",
              parts: [
                {
                  text: `${text}\n\nRespond in a warm, compact paragraph (1–3 sentences). Use everyday language. Avoid clinical jargon. If suggesting an action, keep it tiny and doable in one step.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 10000,
          },
        }),
      });

    const data = await res.json();
    console.log("Gemini raw:", data);

    if (!res.ok) {
      throw new Error(
        `Gemini API error: ${res.status} - ${JSON.stringify(data)}`
      );
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "i'm here with you. let’s take one small step — can we try one deep breath together right now? 🌿";

    setMessages((m) => [...m, { sender: "bot", text: reply, ts: Date.now() }]);
  } catch (err) {
    console.error("Gemini fetch failed:", err);
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

  const dailyData = toPieData(aggregateEmotions(emotionEvents.filter((e) => e.ts >= dayStart)));
  const weeklyData = toPieData(aggregateEmotions(emotionEvents.filter((e) => e.ts >= weekStart)));
  const monthlyData = toPieData(
    aggregateEmotions(emotionEvents.filter((e) => e.ts >= monthStart))
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
      {/* Hidden video/canvas for background emotion detection */}
      <video ref={videoRef} autoPlay muted style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

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
            className="p-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15"
            title="View Analytics (Ctrl+Shift+E)"
          >
            <BarChart3 size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white"
                    : "bg-white/10 text-gray-100"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="bg-white/10 text-gray-100 px-4 py-2 rounded-2xl">
                typing...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`p-3 rounded-xl ${
              recording
                ? "bg-red-500 hover:bg-red-600"
                : "bg-white/10 hover:bg-white/15"
            } border border-white/15`}
          >
            <Mic size={20} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="share what's on your mind..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <button
            onClick={sendMessage}
            className="p-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600"
          >
            <Send size={20} />
          </button>
        </div>

        <p className="mt-3 text-xs text-center text-gray-400">
          Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Ctrl+Shift+E</kbd> to view emotion analytics
        </p>
      </div>
    </div>
  );
}
